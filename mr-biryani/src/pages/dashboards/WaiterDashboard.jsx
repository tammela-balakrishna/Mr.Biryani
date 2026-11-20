import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, ordersApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, ORDER_NEXT, errorText, shortId } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

export default function WaiterDashboard() {
  const { user, hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [t, o] = await Promise.all([floorApi.tables(branchId), ordersApi.list(branchId)])
      setTables(t); setOrders(o)
    } catch (err) {
      setError(errorText(err, 'Could not load your dashboard.'))
    }
  }, [branchId])
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  const mine = tables.filter((t) => t.waiter_user_id && t.waiter_user_id === user?.id)
  const ready = orders.filter((o) => o.status === 'READY').length

  const advance = async (order) => {
    setError('')
    try { 
      await ordersApi.setStatus(order.id, ORDER_NEXT[order.status].to)
      await load() 
    } catch (err) { 
      setError(errorText(err, 'Could not update the order.')) 
    }
  }

  return (
    <Shell eyebrow="Waiter" title={`Hello, ${user?.fullName ?? 'there'}`} links={[['Menu', '/menu']]}>
      <Message text={branchError || error} />
      <Kpis items={[
        ['My tables', mine.length],
        ['Open orders', orders.length],
        ['Ready to serve', ready],
        ['Occupied (all tables)', tables.filter((t) => t.status === 'OCCUPIED').length],
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="My tables">
          {mine.map((t) => (
            <div key={t.id} className={card}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
                  <p className="text-sm text-[#D4A63A]">{t.status}</p>
                </div>
                
                {/* Routes to the Menu page, passing BOTH tableId and branchId */}
                {hasPermission('orders.create') && (
                  <button 
                    className={ghost} 
                    onClick={() => navigate(`/menu?tableId=${t.id}&branchId=${branchId}`)}
                  >
                    + Take Order
                  </button>
                )}
              </div>
            </div>
          ))}
          {mine.length === 0 ? <Empty>No tables are assigned to you yet. Ask the captain to assign one.</Empty> : null}
        </Section>

        <Section title="Orders to move along">
          {orders.map((o) => {
            const step = ORDER_NEXT[o.status]
            const isServed = o.status === 'SERVED'
            return (
              <div key={o.id} className={card}>
                <div className="flex justify-between">
                  <p className="font-bold">{shortId(o.id)}</p>
                  <p className="text-[#D4A63A]">{o.status}</p>
                </div>
                <ul className="mt-2 text-sm text-neutral-200">
                  {o.items.map((i) => <li key={i.name + i.quantity}>{i.quantity} × {i.name}</li>)}
                </ul>
                {step && hasPermission('orders.update') ? (
                  <button className={`${button} mt-3`} onClick={() => advance(o)}>{step.label}</button>
                ) : null}
                {isServed && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                    <span>🍽️ Food Served</span>
                    <span className="text-neutral-400">· Awaiting Bill & Payment (Cashier)</span>
                  </div>
                )}
              </div>
            )
          })}
          {orders.length === 0 ? <Empty>No open orders right now.</Empty> : null}
        </Section>
      </div>
    </Shell>
  )
}