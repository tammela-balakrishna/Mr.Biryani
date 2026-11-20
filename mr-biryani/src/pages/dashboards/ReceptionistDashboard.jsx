import { useCallback, useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Users,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  LayoutGrid,
  X,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, receptionApi } from '../../api/staff'
import {
  useBranch,
  card,
  button,
  ghost,
  field,
  today,
  errorText,
  timeOf,
  TABLE_STATUSES,
} from './shared'
import { Message, Shell, Empty } from './ui'

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const STATUS_CONFIG = {
  REQUESTED: {
    label: 'Needs Confirmation',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dot: 'bg-amber-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    dot: 'bg-sky-400',
  },
  CHECKED_IN: {
    label: 'Seated & Checked In',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'bg-neutral-800 text-neutral-400 border border-neutral-700',
    dot: 'bg-neutral-500',
  },
}

const TABLE_STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Available',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  OCCUPIED: {
    label: 'Occupied',
    badge: 'bg-amber-500/10 text-[#E0B246] border border-[#D4A63A]/30',
    dot: 'bg-[#D4A63A]',
  },
  RESERVED: {
    label: 'Reserved',
    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    dot: 'bg-purple-400',
  },
  CLEANING: {
    label: 'Cleaning',
    badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    dot: 'bg-rose-400',
  },
}

export default function ReceptionistDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()

  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // View & Filter states
  const [viewTab, setViewTab] = useState('ALL') // ALL, RESERVATIONS, TABLES
  const [resFilter, setResFilter] = useState('ALL')
  const [tableFilter, setTableFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const [r, t] = await Promise.all([receptionApi.day(branchId, date), floorApi.tables(branchId)])
      setRows(r)
      setTables(t)
    } catch (err) {
      setError(errorText(err, 'Could not load reservations.'))
    } finally {
      setLoading(false)
    }
  }, [branchId, date])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const act = async (fn, successMessage) => {
    setError('')
    setNotice('')
    try {
      await fn()
      if (successMessage) setNotice(successMessage)
      await load()
    } catch (err) {
      setError(errorText(err, 'That change could not be saved.'))
    }
  }

  // Action handlers
  const handleConfirm = async (r) => {
    await act(
      () => receptionApi.confirm(branchId, r.id),
      `Reservation for ${r.guestName || 'guest'} confirmed.`
    )
  }

  const handleCheckIn = async (r) => {
    await act(
      () => receptionApi.checkIn(branchId, r.id),
      `Guest ${r.guestName || 'guest'} checked in and seated.`
    )
  }

  const handleCancel = async (r) => {
    if (window.confirm(`Cancel reservation for ${r.guestName || 'this guest'}?`)) {
      await act(
        () => receptionApi.cancel(r.id),
        `Reservation for ${r.guestName || 'guest'} cancelled.`
      )
    }
  }

  // Counts & Filtered Lists
  const pendingCount = rows.filter((r) => r.status === 'REQUESTED').length
  const confirmedCount = rows.filter((r) => r.status === 'CONFIRMED').length
  const checkedInCount = rows.filter((r) => r.status === 'CHECKED_IN').length
  const activeBookingsCount = rows.filter((r) => r.status !== 'CANCELLED').length
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE')
  const cleaningTables = tables.filter((t) => t.status === 'CLEANING')

  const filteredReservations = rows.filter((r) => {
    if (resFilter !== 'ALL' && r.status !== resFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const nameMatch = r.guestName?.toLowerCase().includes(q)
      const notesMatch = r.notes?.toLowerCase().includes(q)
      return nameMatch || notesMatch
    }
    return true
  })

  const filteredTables = tables.filter((t) => {
    if (tableFilter !== 'ALL' && t.status !== tableFilter) return false
    return true
  })

  const isToday = date === today()
  const isTomorrow = date === tomorrow()

  return (
    <Shell
      eyebrow="Front Desk & Concierge"
      title="Reception Desk"
      links={hasPermission('roles.manage') ? [['Admin', '/admin']] : []}
    >
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />

      {/* Top Action & Control Bar */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#171412] to-[#111010] p-5 sm:flex-row sm:items-center">
        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              onClick={() => setDate(today())}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isToday
                  ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDate(tomorrow())}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isTomorrow
                  ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Tomorrow
            </button>
          </div>

          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
            <input
              type="date"
              className={`${field} py-1.5 pl-9 pr-3 text-xs sm:w-44`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Select Date"
            />
          </div>

          <button
            onClick={() => load()}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#D4A63A]' : ''}`} />
          </button>
        </div>
      </section>

      {/* Reception KPIs & Attention Overview */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Bookings</span>
            <Calendar className="h-4 w-4 text-neutral-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{activeBookingsCount}</p>
          <p className="mt-1 text-xs text-neutral-500">{isToday ? "Scheduled for today" : `Booked for ${date}`}</p>
        </div>

        <div
          className={`rounded-2xl border p-5 transition ${
            pendingCount > 0
              ? 'border-[#D4A63A] bg-gradient-to-br from-[#1d1610] to-[#111010] shadow-lg shadow-[#D4A63A]/10'
              : 'border-white/10 bg-[#111010]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">To Confirm</span>
            <AlertCircle className={`h-4 w-4 ${pendingCount > 0 ? 'text-[#D4A63A]' : 'text-neutral-500'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${pendingCount > 0 ? 'text-[#D4A63A]' : 'text-white'}`}>
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Awaiting front-desk confirmation</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Checked In</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{checkedInCount}</p>
          <p className="mt-1 text-xs text-neutral-500">Currently dining / seated</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Tables Available</span>
            <LayoutGrid className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{availableTables.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Ready to seat walk-in guests</p>
        </div>

        <div className={`rounded-2xl border p-5 transition ${
          cleaningTables.length > 0
            ? 'border-rose-500/40 bg-rose-500/5'
            : 'border-white/10 bg-[#111010]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Turnaround / Cleaning</span>
            <RefreshCw className={`h-4 w-4 ${cleaningTables.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${cleaningTables.length > 0 ? 'text-rose-400' : 'text-white'}`}>
            {cleaningTables.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Wiping & resetting for next guest</p>
        </div>
      </section>

      {/* View Switcher Pills */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('ALL')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewTab === 'ALL'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Split View (Desk & Floor)
          </button>
          <button
            onClick={() => setViewTab('RESERVATIONS')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewTab === 'RESERVATIONS'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Reservations ({rows.length})
          </button>
          <button
            onClick={() => setViewTab('TABLES')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              viewTab === 'TABLES'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Table Board ({tables.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`grid gap-8 ${viewTab === 'ALL' ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Left Column: Reservations & Guest Queue */}
        {(viewTab === 'ALL' || viewTab === 'RESERVATIONS') ? (
          <section className={`space-y-4 ${viewTab === 'ALL' ? 'lg:col-span-7' : 'w-full'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D4A63A]" />
                <h3 className="font-serif text-xl font-bold text-white">Guest Reservations</h3>
              </div>

              {/* Search Box */}
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  className={`${field} py-1.5 pl-8 pr-3 text-xs`}
                  placeholder="Search guest or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Reservation Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                ['ALL', `All (${rows.length})`],
                ['REQUESTED', `Pending (${pendingCount})`],
                ['CONFIRMED', `Confirmed (${confirmedCount})`],
                ['CHECKED_IN', `Seated (${checkedInCount})`],
                ['CANCELLED', 'Cancelled'],
              ].map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => setResFilter(status)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    resFilter === status
                      ? 'bg-[#D4A63A] text-black font-semibold shadow-sm'
                      : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Reservation Cards List */}
            <div className="space-y-3">
              {filteredReservations.map((r) => {
                const conf = STATUS_CONFIG[r.status] || STATUS_CONFIG.REQUESTED
                return (
                  <div
                    key={r.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#141210] to-[#0d0c0c] p-4 transition-all hover:border-white/20 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-base font-bold text-white">
                          {r.guestName || 'Valued Guest'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${conf.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Clock className="h-3.5 w-3.5 text-[#D4A63A]" />
                          {timeOf(r.startsAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-neutral-300">
                          <Users className="h-3.5 w-3.5 text-[#D4A63A]" />
                          {r.partySize} guests
                        </span>
                        {r.notes ? (
                          <>
                            <span>•</span>
                            <span className="italic text-neutral-400">"{r.notes}"</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === 'REQUESTED' && hasPermission('reservations.confirm') ? (
                        <button
                          className={button}
                          onClick={() => handleConfirm(r)}
                        >
                          Confirm
                        </button>
                      ) : null}

                      {r.status === 'CONFIRMED' && hasPermission('reservations.check_in') ? (
                        <button
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-emerald-900/30 transition hover:bg-emerald-500 active:scale-95"
                          onClick={() => handleCheckIn(r)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Check in</span>
                        </button>
                      ) : null}

                      {(r.status === 'REQUESTED' || r.status === 'CONFIRMED') && hasPermission('reservations.cancel') ? (
                        <button
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20 active:scale-95"
                          onClick={() => handleCancel(r)}
                          title="Cancel reservation"
                        >
                          Cancel
                        </button>
                      ) : null}

                      {r.status === 'CHECKED_IN' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Seated
                        </span>
                      ) : null}

                      {r.status === 'CANCELLED' ? (
                        <span className="flex items-center gap-1 text-xs text-neutral-500">
                          <XCircle className="h-4 w-4" />
                          Cancelled
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {filteredReservations.length === 0 ? (
                <div className={`${card} py-8 text-center`}>
                  <Empty>
                    {searchQuery
                      ? 'No reservations matched your search.'
                      : resFilter !== 'ALL'
                      ? `No ${resFilter.toLowerCase()} reservations for this day.`
                      : 'No reservations scheduled for this day.'}
                  </Empty>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Right Column: Table Board & Floor Status */}
        {(viewTab === 'ALL' || viewTab === 'TABLES') ? (
          <section className={`space-y-4 ${viewTab === 'ALL' ? 'lg:col-span-5' : 'w-full'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-[#D4A63A]" />
                <h3 className="font-serif text-xl font-bold text-white">Live Floor & Tables</h3>
              </div>
              <span className="text-xs text-neutral-400">
                {availableTables.length} of {tables.length} free
              </span>
            </div>

            {/* Table Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].map((status) => (
                <button
                  key={status}
                  onClick={() => setTableFilter(status)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    tableFilter === status
                      ? 'bg-[#D4A63A] text-black font-semibold shadow-sm'
                      : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {status === 'ALL' ? `All (${tables.length})` : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Table Cards Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTables.map((t) => {
                const conf = TABLE_STATUS_CONFIG[t.status] || TABLE_STATUS_CONFIG.AVAILABLE
                return (
                  <div
                    key={t.id}
                    className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-[#141210] to-[#0d0c0c] p-4 transition-all hover:border-white/20"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-serif text-lg font-bold text-white">
                          {t.label}
                        </span>
                        <span className="rounded-lg bg-white/5 px-2 py-0.5 text-xs text-neutral-400 font-mono">
                          {t.capacity} seats
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${conf.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>

                        {t.waiter ? (
                          <span className="text-[11px] text-neutral-400">
                            W: {t.waiter}
                          </span>
                        ) : null}
                      </div>

                      {/* Particular Time Reservation & Remaining Time Availability */}
                      {t.reservation_time && (
                        <div className="mt-2.5 rounded-lg border border-[#D4A63A]/30 bg-[#D4A63A]/10 px-2.5 py-1.5 text-xs">
                          <p className="font-semibold text-[#E0B246] flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Booking: {timeOf(t.reservation_time)} ({t.reservation_guest || 'Reserved Guest'})</span>
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {t.status === 'AVAILABLE' ? '⚡ Available for current dining during remaining time' : 'Held for upcoming booking'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Floor Status Indicator & Remaining Time Override */}
                    <div className="mt-3 border-t border-white/5 pt-2">
                      <p className="text-[11px] font-medium text-neutral-400">
                        {t.status === 'AVAILABLE' && (t.reservation_time ? '✓ Free now (Reserved later today)' : '✓ Ready to seat incoming guests')}
                        {t.status === 'CLEANING' && '🧹 Turnaround in progress (Supervised by Captain)'}
                        {t.status === 'OCCUPIED' && '🍽️ Diners currently seated'}
                        {t.status === 'RESERVED' && '📅 Reserved for scheduled booking'}
                      </p>

                      {t.status === 'RESERVED' && (
                        <button
                          onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, 'AVAILABLE'), `${t.label} unlocked as Available for remaining orders.`)}
                          className="mt-2 w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
                          title="If guest has not arrived, free table for other diners during remaining time"
                        >
                          Make Available for Remaining Time
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {filteredTables.length === 0 ? (
                <div className={`${card} col-span-2 py-8 text-center`}>
                  <Empty>No tables in this status category.</Empty>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  )
}
