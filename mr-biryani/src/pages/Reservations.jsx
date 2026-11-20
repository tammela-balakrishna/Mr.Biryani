import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CalendarDays, Clock3, Users, CheckCircle2 } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../api/client'

const field = 'w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none transition focus:border-[#D4A63A]'
const STATUS_LABEL = { REQUESTED: 'Requested', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked in', CANCELLED: 'Cancelled' }
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

const DEFAULT_BRANCHES = [
  { id: '86841c23-a243-4282-bb0d-65415b68ae36', code: 'MAIN', name: 'Mr. Biryani - BTM 1st Stage (Main)' }
]

function ReservationsContent() {
  const { user, hasPermission, isStaff } = useAuth()
  const canReserve = hasPermission('reservations.manage_own') || hasPermission('reservations.create')
  const [branches, setBranches] = useState(DEFAULT_BRANCHES)
  const [tables, setTables] = useState([])
  const [mine, setMine] = useState([])
  const [form, setForm] = useState({ branchId: DEFAULT_BRANCHES[0].id, date: '', time: '19:00', guests: '2', tableId: '', notes: '' })
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = () => api.get('/api/v1/reservations/mine').then(setMine).catch(() => setMine([]))

  const loadTables = (branchId, dateVal = form.date, timeVal = form.time) => {
    if (!branchId) return
    let query = ''
    if (dateVal && timeVal) {
      const dt = new Date(`${dateVal}T${timeVal}:00`)
      if (!Number.isNaN(dt.getTime())) {
        query = `?at=${encodeURIComponent(dt.toISOString())}`
      }
    }
    api.get(`/api/v1/branches/${branchId}/tables${query}`)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || [])
        setTables(list)
      })
      .catch(() => setTables([]))
  }

  const change = (e) => {
    const { name, value } = e.target
    setForm((current) => {
      const updated = { ...current, [name]: value }
      if (name === 'date' || name === 'time') {
        loadTables(updated.branchId, updated.date, updated.time)
      }
      return updated
    })
  }

  useEffect(() => {
    api.get('/api/v1/branches').then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        setBranches(list)
        const chosen = list[0].id
        setForm((f) => ({ ...f, branchId: f.branchId || chosen }))
        loadTables(chosen, form.date, form.time)
      }
    }).catch((err) => {
      console.warn('Could not load branches, using default:', err)
      loadTables(DEFAULT_BRANCHES[0].id, form.date, form.time)
    })
    reload()
  }, [])

  const handleBranchChange = (e) => {
    const bId = e.target.value
    setForm((f) => ({ ...f, branchId: bId, tableId: '' }))
    loadTables(bId, form.date, form.time)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    // Interpret the chosen date and time in the visitor's local timezone; the API expects an absolute instant.
    const startsAt = new Date(`${form.date}T${form.time}:00`)
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      setError('Choose a date and time in the future.')
      return
    }
    setBusy(true)
    try {
      const reservation = await api.post(`/api/v1/branches/${form.branchId}/reservations`, {
        partySize: Number(form.guests),
        startsAt: startsAt.toISOString(),
        notes: form.notes || undefined,
        guestName: user?.fullName,
        tableId: form.tableId || undefined,
      })
      setSaved(reservation)
      reload()
      loadTables(form.branchId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reservation request.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (id) => {
    try {
      await api.post(`/api/v1/reservations/${id}/cancel`)
      reload()
      loadTables(form.branchId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel the reservation.')
    }
  }

  if (!canReserve) {
    return <Navigate to={isStaff ? '/dashboard' : '/'} replace />
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <section>
          <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">A table is waiting</p>
          <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Reserve Your <span className="text-[#D4A63A]">Table</span></h1>
          <p className="mt-5 max-w-lg leading-8 text-neutral-400">Send a request and track it here. Staff confirm each reservation.</p>
          <div className="mt-8 space-y-4 text-sm text-neutral-300">
            <p className="flex items-center gap-3"><CalendarDays className="text-[#D4A63A]" /> Pick a date within the next 120 days</p>
            <p className="flex items-center gap-3"><Clock3 className="text-[#D4A63A]" /> Choose a convenient time</p>
            <p className="flex items-center gap-3"><Users className="text-[#D4A63A]" /> Tell us how many guests to expect</p>
          </div>

          <h2 className="mt-12 font-serif text-2xl font-bold">My <span className="text-[#D4A63A]">reservations</span></h2>
          {mine.length === 0 ? <p className="mt-4 text-sm text-neutral-500">No reservations yet.</p> : (
            <ul className="mt-4 space-y-3">
              {mine.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#111010] p-4 text-sm">
                  <div>
                    <p className="font-semibold text-white">
                      {new Date(r.startsAt).toLocaleString()} · {r.partySize} guests
                    </p>
                    {r.tableLabel ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2.5 py-0.5 text-xs font-semibold text-[#E0B246]">
                        🍽️ Table: {r.tableLabel}
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center text-xs text-neutral-400">
                        Table: Auto-allocated on arrival
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-[#D4A63A]">
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    {(r.status === 'REQUESTED' || r.status === 'CONFIRMED') && (
                      <button onClick={() => cancel(r.id)} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20">
                        Cancel
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#D4A63A]/20 bg-[#111010] p-6 sm:p-9">
          {saved ? (
            <div className="py-10 text-center">
              <CheckCircle2 size={48} className="mx-auto text-[#D4A63A]" />
              <h2 className="mt-5 font-serif text-2xl font-bold">Request received</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">Reference <strong className="text-white">{saved.id.slice(0, 8).toUpperCase()}</strong> · Status {STATUS_LABEL[saved.status] || saved.status}</p>
              {saved.tableLabel && (
                <p className="mt-2 text-xs font-semibold text-[#E0B246]">
                  Reserved Dining Table: {saved.tableLabel}
                </p>
              )}
              <button onClick={() => setSaved(null)} className="mt-7 rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">Make another request</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <h2 className="font-serif text-2xl font-bold">Reservation details</h2>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <label className="block text-sm text-neutral-300">Branch
                <select required name="branchId" value={form.branchId} onChange={handleBranchChange} className={field + ' mt-2'}>
                  <option value="">Choose a branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-neutral-300">Date<input required type="date" name="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={change} className={field + ' mt-2 [color-scheme:dark]'} /></label>
                <label className="text-sm text-neutral-300">Time<input required type="time" name="time" value={form.time} onChange={change} className={field + ' mt-2 [color-scheme:dark]'} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-neutral-300">Guests
                  <select name="guests" value={form.guests} onChange={change} className={field + ' mt-2'}>
                    {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <label className="text-sm text-neutral-300">Preferred Table (Optional)
                  <select name="tableId" value={form.tableId} onChange={change} className={field + ' mt-2'}>
                    <option value="">Any Available Table (Automatic)</option>
                    {tables.map((t) => {
                      const isConflict = Boolean(t.is_slot_reserved)
                      const isAvail = !isConflict
                      return (
                        <option key={t.id} value={t.id} disabled={!isAvail}>
                          {t.label} ({t.capacity} seats) · {isAvail ? '✓ Available' : `✕ Booked (${timeOf(t.slot_starts_at)} · 45m slot buffer)`}
                        </option>
                      )
                    })}
                  </select>
                </label>
              </div>
              <label className="block text-sm text-neutral-300">Special requests<textarea name="notes" rows={3} maxLength={500} value={form.notes} onChange={change} className={field + ' mt-2'} /></label>
              <button disabled={busy} className="w-full rounded-xl bg-[#D4A63A] px-5 py-4 font-bold text-black transition hover:bg-[#E8BD57] disabled:opacity-50">{busy ? 'Sending…' : 'Request reservation'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

export default function Reservations() {
  return (
    <ProtectedRoute anyOf={['reservations.manage_own', 'reservations.create']}>
      <ReservationsContent />
    </ProtectedRoute>
  )
}
