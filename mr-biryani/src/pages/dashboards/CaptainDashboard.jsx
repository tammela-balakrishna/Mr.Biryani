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
  const cleaning = tables.filter((t) => t.status === 'CLEANING').length
  const available = tables.filter((t) => t.status === 'AVAILABLE').length
  const waitingKitchen = orders.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length
  const readyToServe = orders.filter((o) => o.status === 'READY').length

  const kpis = [
    ['Occupied Tables', `${occupied} / ${tables.length}`],
    ['Cleaning / Turnover', cleaning],
    ['Available for Seating', available],
    ['Orders in kitchen', waitingKitchen],
    ['Ready to serve', readyToServe],
  ]
  if (hasPermission('reservations.read')) {
    kpis.push(['Guests expected today', reservations.filter((r) => r.status !== 'CANCELLED').length])
  }

  return (
    <Shell eyebrow="Captain" title="Floor dashboard" links={[['Menu', '/menu']]}>
      <Message text={branchError || error} />
      <Kpis items={kpis} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Floor Tables & Turnaround Supervision">
          <div className="grid gap-3 sm:grid-cols-2">
            {tables.map((t) => {
              const isCleaning = t.status === 'CLEANING'
              const isOccupied = t.status === 'OCCUPIED'
              const isAvailable = t.status === 'AVAILABLE'
              return (
                <div key={t.id} className={card}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
                      <p className={`text-xs font-semibold mt-0.5 ${
                        isAvailable ? 'text-emerald-400' : isCleaning ? 'text-rose-400' : isOccupied ? 'text-[#D4A63A]' : 'text-purple-400'
                      }`}>
                        {isCleaning ? '🧹 Being Cleaned' : t.status}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{t.waiter ? `Waiter: ${t.waiter}` : 'No waiter assigned'}</p>

                  {/* Upcoming Particular Time Reservation info */}
                  {t.reservation_time && (
                    <div className="mt-2 rounded-lg border border-[#D4A63A]/30 bg-[#D4A63A]/10 px-2.5 py-1 text-[11px] text-[#E0B246] font-medium">
                      🕒 Booking at {timeOf(t.reservation_time)} ({t.reservation_guest || 'Guest'}) · Free for remaining time
                    </div>
                  )}

                  {/* Captain Table Status Controls: Available, Occupied, Cleaning */}
                  <div className="mt-3 border-t border-white/5 pt-2">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1.5">Change Table Status:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        className={`rounded-lg py-1.5 text-xs font-semibold transition active:scale-95 ${
                          isAvailable
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/10 cursor-default'
                            : 'bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300'
                        }`}
                        disabled={isAvailable}
                        onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, 'AVAILABLE'))}
                        title="Mark table cleaned, sanitized, and ready for guests"
                      >
                        ✓ Available
                      </button>

                      <button
                        className={`rounded-lg py-1.5 text-xs font-semibold transition active:scale-95 ${
                          isOccupied
                            ? 'bg-amber-500/25 text-[#E0B246] border border-[#D4A63A]/50 shadow-sm shadow-[#D4A63A]/10 cursor-default'
                            : 'bg-amber-500/10 text-[#D4A63A]/80 border border-[#D4A63A]/20 hover:bg-amber-500/20 hover:text-[#E0B246]'
                        }`}
                        disabled={isOccupied}
                        onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, 'OCCUPIED'))}
                        title="Mark table occupied with seated guests"
                      >
                        🍽️ Occupied
                      </button>

                      <button
                        className={`rounded-lg py-1.5 text-xs font-semibold transition active:scale-95 ${
                          isCleaning
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/10 cursor-default'
                            : 'bg-rose-500/10 text-rose-400/80 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300'
                        }`}
                        disabled={isCleaning}
                        onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, 'CLEANING'))}
                        title="Send busboy to clean and reset table"
                      >
                        🧹 Cleaning
                      </button>
                    </div>
                  </div>

                  {canAssign && waiters.length > 0 ? (
                    <div className="mt-2 border-t border-white/5 pt-2 flex flex-wrap gap-1">
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold w-full">Assign Waiter:</span>
                      {waiters.map((w) => (
                        <button
                          key={w.user_id}
                          className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                            t.waiter_user_id === w.user_id
                              ? 'bg-[#D4A63A] text-black font-bold'
                              : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-[#D4A63A]/40 hover:text-white'
                          }`}
                          onClick={() => act(() => floorApi.assignWaiter(branchId, t.id, w.user_id))}
                        >
                          {w.full_name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {tables.length === 0 ? <Empty>No tables set up yet.</Empty> : null}
        </Section>

        <Section title="Orders to supervise">
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
                  <button className={`${button} mt-3`} onClick={() => act(() => ordersApi.setStatus(o.id, step.to))}>{step.label}</button>
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
          {orders.length === 0 ? <Empty>No open orders.</Empty> : null}
        </Section>

        {hasPermission('reservations.read') && (
          <Section title="Today's reservations (Read Only)" className="lg:col-span-2">
            {reservations.map((r) => (
              <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="font-semibold text-white">
                    {timeOf(r.startsAt)} · {r.partySize} guests · {r.guestName ?? 'Guest'}
                  </p>
                  {r.tableLabel ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2 py-0.5 text-xs font-semibold text-[#E0B246]">
                      🍽️ Table: {r.tableLabel}
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center text-xs text-neutral-400">
                      Table: Unassigned / Front Desk
                    </span>
                  )}
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-[#D4A63A]">
                  {r.status}
                </span>
              </div>
            ))}
            {reservations.length === 0 ? <Empty>No reservations scheduled for today.</Empty> : null}
          </Section>
        )}
      </div>
    </Shell>
  )
}
