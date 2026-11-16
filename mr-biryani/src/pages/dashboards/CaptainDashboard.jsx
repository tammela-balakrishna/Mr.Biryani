import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, ordersApi, receptionApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, ORDER_NEXT, TABLE_STATUSES, today, errorText, shortId, timeOf } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

// Captain: watches the floor, keeps orders moving to the kitchen and serving, and seats today's guests.
export default function CaptainDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [waiters, setWaiters] = useState([])
  const [error, setError] = useState('')
  const canAssign = hasPermission('tables.assign') || hasPermission('floor.assign_waiter')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [t, o, r, w] = await Promise.all([
        floorApi.tables(branchId),
        ordersApi.list(branchId),
        receptionApi.day(branchId, today()),
        canAssign ? floorApi.waiters(branchId) : Promise.resolve([]),
      ])
      setTables(t); setOrders(o); setReservations(r); setWaiters(w)
    } catch (err) {
      setError(errorText(err, 'Could not load the floor.'))
    }
  }, [branchId, canAssign])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  const act = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length
  const waitingKitchen = orders.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length
  const readyToServe = orders.filter((o) => o.status === 'READY').length

  return (
    <Shell eyebrow="Captain" title="Floor dashboard" links={[['Menu', '/menu']]}>
      <Message text={branchError || error} />
      <Kpis items={[
        ['Tables occupied', `${occupied} / ${tables.length}`],
        ['Orders in kitchen', waitingKitchen],
        ['Ready to serve', readyToServe],
        ['Guests expected today', reservations.filter((r) => r.status !== 'CANCELLED').length],
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Tables">
          <div className="grid gap-3 sm:grid-cols-2">
            {tables.map((t) => (
              <div key={t.id} className={card}>
                <p className="font-bold">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
                <p className="text-sm text-[#D4A63A]">{t.status}</p>
                <p className="mt-1 text-xs text-neutral-400">{t.waiter ? `Waiter: ${t.waiter}` : 'No waiter assigned'}</p>
                {hasPermission('tables.allocate') ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {TABLE_STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button key={s} className={ghost} onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, s))}>{s}</button>
                    ))}
                  </div>
                ) : null}
                {canAssign && waiters.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {waiters.map((w) => (
                      <button key={w.user_id} className={ghost} onClick={() => act(() => floorApi.assignWaiter(branchId, t.id, w.user_id))}>
                        Assign {w.full_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {tables.length === 0 ? <Empty>No tables set up yet.</Empty> : null}
        </Section>

        <Section title="Orders to supervise">
          {orders.map((o) => {
            const step = ORDER_NEXT[o.status]
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
                  <button className={`${button} mt-3`} onClick={() => act(() => ordersApi.setStatus(o.id, step.to))}>{step.label}</button>
                ) : null}
              </div>
            )
          })}
          {orders.length === 0 ? <Empty>No open orders.</Empty> : null}
        </Section>

        <Section title="Today's reservations" className="lg:col-span-2">
          {reservations.map((r) => (
            <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <p>{timeOf(r.startsAt)} · {r.partySize} guests · {r.guestName ?? 'Guest'} · <span className="text-[#D4A63A]">{r.status}</span></p>
              {r.status === 'CONFIRMED' && hasPermission('reservations.check_in') ? (
                <button className={button} onClick={() => act(() => receptionApi.checkIn(branchId, r.id))}>Check in</button>
              ) : null}
            </div>
          ))}
          {reservations.length === 0 ? <Empty>No reservations today.</Empty> : null}
        </Section>
      </div>
    </Shell>
  )
}
