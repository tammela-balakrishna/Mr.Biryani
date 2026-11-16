import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, receptionApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, field, today, errorText, timeOf, TABLE_STATUSES } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

const STATUS_LABEL = { REQUESTED: 'Requested', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked in', CANCELLED: 'Cancelled' }

// Receptionist: today's reservations, walk-in guests and the table board.
export default function ReceptionistDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [tables, setTables] = useState([])
  const [walk, setWalk] = useState({ guestName: '', partySize: '2' })
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [r, t] = await Promise.all([receptionApi.day(branchId, date), floorApi.tables(branchId)])
      setRows(r); setTables(t)
    } catch (err) {
      setError(errorText(err, 'Could not load reservations.'))
    }
  }, [branchId, date])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const act = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  return (
    <Shell eyebrow="Reception" title="Reception dashboard" links={[['Reservations', '/reservations']]}>
      <Message text={branchError || error} />
      <Kpis items={[
        ['Reservations', rows.filter((r) => r.status !== 'CANCELLED').length],
        ['To confirm', rows.filter((r) => r.status === 'REQUESTED').length],
        ['Checked in', rows.filter((r) => r.status === 'CHECKED_IN').length],
        ['Tables available', tables.filter((t) => t.status === 'AVAILABLE').length],
      ]} />

      <div className="flex flex-wrap items-center gap-3">
        <input type="date" className={field} style={{ maxWidth: 200 }} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Day" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Reservations">
          {rows.map((r) => (
            <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="font-bold">{timeOf(r.startsAt)} · {r.partySize} guests</p>
                <p className="text-sm text-neutral-400">{STATUS_LABEL[r.status] ?? r.status}{r.notes ? ` · ${r.notes}` : ''}</p>
              </div>
              <div className="flex gap-2">
                {r.status === 'REQUESTED' && hasPermission('reservations.confirm') ? <button className={button} onClick={() => act(() => receptionApi.confirm(branchId, r.id))}>Confirm</button> : null}
                {r.status === 'CONFIRMED' && hasPermission('reservations.check_in') ? <button className={button} onClick={() => act(() => receptionApi.checkIn(branchId, r.id))}>Check in</button> : null}
              </div>
            </div>
          ))}
          {rows.length === 0 ? <Empty>No reservations for this day.</Empty> : null}

          {hasPermission('reservations.check_in') ? (
            <div className={`${card} grid gap-3 sm:grid-cols-3`}>
              <input className={field} placeholder="Walk-in guest name" value={walk.guestName} onChange={(e) => setWalk({ ...walk, guestName: e.target.value })} />
              <input className={field} inputMode="numeric" value={walk.partySize} onChange={(e) => setWalk({ ...walk, partySize: e.target.value.replace(/\D/g, '') })} aria-label="Party size" />
              <button className={button} disabled={!walk.guestName.trim()} onClick={() => act(async () => {
                await receptionApi.walkIn(branchId, { guestName: walk.guestName.trim(), partySize: Number(walk.partySize) })
                setWalk({ guestName: '', partySize: '2' })
              })}>Seat walk-in</button>
            </div>
          ) : null}
        </Section>

        <Section title="Table board">
          <div className="grid gap-3 sm:grid-cols-2">
            {tables.map((t) => (
              <div key={t.id} className={card}>
                <p className="font-bold">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
                <p className="text-sm text-[#D4A63A]">{t.status}</p>
                {hasPermission('tables.allocate') || hasPermission('tables.release') ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {TABLE_STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button key={s} className={ghost} onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, s))}>{s}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {tables.length === 0 ? <Empty>No tables set up yet.</Empty> : null}
        </Section>
      </div>
    </Shell>
  )
}
