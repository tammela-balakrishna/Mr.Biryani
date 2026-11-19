import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  UserRound, 
  ClipboardList, 
  CalendarDays, 
  LogOut, 
  ShoppingBag, 
  Clock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  UtensilsCrossed, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  RefreshCw,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../api/client'
import { addToCart } from '../utils/cart'

const STATUS_COLORS = {
  PLACED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  ACCEPTED: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  PREPARING: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  READY: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  SERVED: 'border-green-500/40 bg-green-500/10 text-green-300',
  COMPLETED: 'border-neutral-500/40 bg-neutral-500/10 text-neutral-300',
  CANCELLED: 'border-red-500/40 bg-red-500/10 text-red-300',
  REQUESTED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  CONFIRMED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  CHECKED_IN: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
}

function ProfileContent() {
  const { user, roles, isStaff, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [orderList, resList] = await Promise.all([
        api.get('/api/v1/orders').catch(() => []),
        api.get('/api/v1/reservations/mine').catch(() => []),
      ])
      setOrders(Array.isArray(orderList) ? orderList : [])
      setReservations(Array.isArray(resList) ? resList : [])
    } catch {
      setError('Could not load some account data. Pull to refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

  // Order stats
  const totalSpent = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [orders]
  )

  const activeOrders = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)),
    [orders]
  )

  const activeReservations = useMemo(
    () => reservations.filter((r) => !['CANCELLED', 'CHECKED_IN'].includes(r.status)),
    [reservations]
  )

  const handleCancelReservation = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return
    setCancellingId(id)
    setError('')
    setActionSuccess('')
    try {
      await api.post(`/api/v1/reservations/${id}/cancel`)
      setActionSuccess('Reservation cancelled successfully.')
      await loadData()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel reservation.')
    } finally {
      setCancellingId(null)
    }
  }

  const handleReorder = (order) => {
    if (!order.items?.length) return
    order.items.forEach((item) => {
      addToCart({
        id: item.menuItemId,
        name: item.name,
        price: Number(item.lineSubtotal) / Number(item.quantity),
      })
    })
    navigate('/order')
  }

  const userInitial = (user?.fullName || 'U').charAt(0).toUpperCase()
  const roleDisplay = roles.includes('CUSTOMER')
    ? 'Customer'
    : roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(', ')

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Profile Hero Header Card */}
        <section className="relative overflow-hidden rounded-3xl border border-[#D4A63A]/30 bg-gradient-to-r from-[#1b0e0c] via-[#140e0c] to-[#0c0a09] p-6 sm:p-8 shadow-2xl">
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#D4A63A]/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D4A63A] to-[#F3E5AB] text-black font-serif text-3xl sm:text-4xl font-bold shadow-lg shadow-[#D4A63A]/20">
                  {userInitial}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-black border-2 border-[#111010]">
                  <ShieldCheck size={16} />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                    {user?.fullName}
                  </h1>
                  <span className="rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/15 px-3 py-0.5 text-xs font-bold text-[#D4A63A]">
                    {roleDisplay}
                  </span>
                </div>

                <p className="mt-1 flex items-center gap-2 text-sm text-neutral-300">
                  <Mail size={14} className="text-[#D4A63A]" />
                  <span>{user?.email}</span>
                </p>

                {user?.phone && (
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-neutral-400">
                    <Phone size={14} className="text-[#D4A63A]" />
                    <span>{user?.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isStaff && (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-xl bg-[#D4A63A] px-4 py-2.5 text-sm font-bold text-black shadow-md hover:bg-[#E8BD57] transition"
                >
                  <UtensilsCrossed size={16} />
                  <span>Staff Terminal</span>
                </Link>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:border-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/10 pt-6">
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-[#D4A63A]">{orders.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Total Spent</p>
              <p className="mt-1 text-2xl font-bold text-white">₹{totalSpent.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Active Bookings</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{activeReservations.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3.5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-medium">Club Tier</p>
              <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-[#D4A63A]">
                <Sparkles size={16} /> Gold Member
              </p>
            </div>
          </div>
        </section>

        {/* Feedback Notices */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto pb-1">
          {[
            ['overview', 'Overview & Highlights', UserRound],
            ['orders', `Order History (${orders.length})`, ClipboardList],
            ['reservations', `Table Bookings (${reservations.length})`, CalendarDays],
            ['actions', 'Account & Quick Actions', Sparkles],
          ].map(([id, label, Icon]) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setError(''); setActionSuccess('') }}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-[#D4A63A] text-[#D4A63A]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Active Orders Tracker */}
            {activeOrders.length > 0 && (
              <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-white">
                  <Clock size={20} className="text-[#D4A63A]" />
                  <span>Orders in Progress</span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[#D4A63A]/40 bg-[#111010] p-5 shadow-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-base">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || ''}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-sm text-neutral-300">
                        {order.items.map((i) => (
                          <div key={i.menuItemId + i.name} className="flex justify-between">
                            <span>{i.name} × {i.quantity}</span>
                            <span>₹{i.lineSubtotal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-3">
                        <span className="text-sm font-bold">Total: ₹{order.total}</span>
                        <Link
                          to="/order"
                          className="text-xs font-semibold text-[#D4A63A] hover:underline flex items-center gap-1"
                        >
                          View Ticket <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Actions Grid */}
            <section className="grid gap-4 sm:grid-cols-3">
              <Link
                to="/menu"
                className="group rounded-2xl border border-white/10 bg-[#111010] p-6 transition-all hover:border-[#D4A63A]/40 hover:-translate-y-1 shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A63A]/10 text-[#D4A63A] group-hover:bg-[#D4A63A] group-hover:text-black transition-colors">
                  <UtensilsCrossed size={24} />
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-white">Order Andhra Biryani</h3>
                <p className="mt-1 text-xs text-neutral-400">Fresh dum biryanis, spicy Andhra starters and desserts.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#D4A63A]">
                  Explore Menu →
                </span>
              </Link>

              <Link
                to="/reservations"
                className="group rounded-2xl border border-white/10 bg-[#111010] p-6 transition-all hover:border-[#D4A63A]/40 hover:-translate-y-1 shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A63A]/10 text-[#D4A63A] group-hover:bg-[#D4A63A] group-hover:text-black transition-colors">
                  <CalendarDays size={24} />
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-white">Book a Dining Table</h3>
                <p className="mt-1 text-xs text-neutral-400">Reserve a table for your family, party, or business lunch.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#D4A63A]">
                  Reserve Now →
                </span>
              </Link>

              <Link
                to="/reviews"
                className="group rounded-2xl border border-white/10 bg-[#111010] p-6 transition-all hover:border-[#D4A63A]/40 hover:-translate-y-1 shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A63A]/10 text-[#D4A63A] group-hover:bg-[#D4A63A] group-hover:text-black transition-colors">
                  <Sparkles size={24} />
                </div>
                <h3 className="mt-4 font-serif text-lg font-bold text-white">Share Your Review</h3>
                <p className="mt-1 text-xs text-neutral-400">Tell us about your experience and Andhra spice journey.</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#D4A63A]">
                  Write Review →
                </span>
              </Link>
            </section>
          </div>
        )}

        {/* TAB 2: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <section className="space-y-4">
            {loading ? (
              <p className="text-center py-12 text-neutral-400">Loading your orders…</p>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#111010] p-12 text-center">
                <ShoppingBag size={48} className="mx-auto text-[#D4A63A]" />
                <h3 className="mt-4 font-serif text-xl font-bold">No orders placed yet</h3>
                <p className="mt-2 text-sm text-neutral-400">Satisfy your cravings with our signature Andhra specialties.</p>
                <Link
                  to="/menu"
                  className="mt-6 inline-flex rounded-xl bg-[#D4A63A] px-6 py-3 font-bold text-black hover:bg-[#E8BD57] transition shadow-md"
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-white/10 bg-[#111010] p-5 sm:p-6 transition hover:border-white/20 shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-white">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[order.status] || ''}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => handleReorder(order)}
                        className="flex items-center gap-1.5 rounded-xl border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-4 py-2 text-xs font-bold text-[#D4A63A] hover:bg-[#D4A63A] hover:text-black transition"
                      >
                        <RefreshCw size={14} />
                        <span>Order Again</span>
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-neutral-300">
                      {order.items.map((item) => (
                        <div key={item.menuItemId + item.name} className="flex justify-between">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-medium text-white">₹{item.lineSubtotal}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4 font-bold">
                      <span className="text-neutral-300">Total (inclusive of tax)</span>
                      <span className="text-lg text-[#D4A63A]">₹{order.total}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: RESERVATIONS */}
        {activeTab === 'reservations' && (
          <section className="space-y-4">
            {loading ? (
              <p className="text-center py-12 text-neutral-400">Loading your reservations…</p>
            ) : reservations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#111010] p-12 text-center">
                <CalendarDays size={48} className="mx-auto text-[#D4A63A]" />
                <h3 className="mt-4 font-serif text-xl font-bold">No reservations made</h3>
                <p className="mt-2 text-sm text-neutral-400">Planning a lunch or dinner? Reserve your table in seconds.</p>
                <Link
                  to="/reservations"
                  className="mt-6 inline-flex rounded-xl bg-[#D4A63A] px-6 py-3 font-bold text-black hover:bg-[#E8BD57] transition shadow-md"
                >
                  Book a Table
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {reservations.map((r) => {
                  const isUpcoming = ['REQUESTED', 'CONFIRMED'].includes(r.status)
                  return (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-white/10 bg-[#111010] p-5 shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[r.status] || ''}`}>
                            {r.status}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono">
                            #{r.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          <p className="flex items-center gap-2 text-base font-bold text-white">
                            <Clock size={16} className="text-[#D4A63A]" />
                            <span>{new Date(r.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </p>
                          <p className="flex items-center gap-2 text-sm text-neutral-300">
                            <UserRound size={16} className="text-[#D4A63A]" />
                            <span>Party of {r.partySize} {r.partySize === 1 ? 'Guest' : 'Guests'}</span>
                          </p>
                          {r.notes && (
                            <p className="text-xs text-neutral-400 italic bg-white/5 p-2 rounded-lg mt-2">
                              “{r.notes}”
                            </p>
                          )}
                        </div>
                      </div>

                      {isUpcoming && (
                        <div className="mt-5 border-t border-white/10 pt-3">
                          <button
                            disabled={cancellingId === r.id}
                            onClick={() => handleCancelReservation(r.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition"
                          >
                            <XCircle size={15} />
                            <span>{cancellingId === r.id ? 'Cancelling…' : 'Cancel Reservation'}</span>
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: ACCOUNT & QUICK ACTIONS */}
        {activeTab === 'actions' && (
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#111010] p-6 shadow-lg space-y-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <UserRound size={20} className="text-[#D4A63A]" />
                <span>Account Information</span>
              </h3>
              
              <div className="space-y-3 pt-2 text-sm">
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase">Full Name</p>
                  <p className="font-semibold text-white mt-0.5">{user?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase">Email Address</p>
                  <p className="font-semibold text-white mt-0.5">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase">Mobile Phone</p>
                  <p className="font-semibold text-white mt-0.5">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase">Assigned Roles</p>
                  <p className="font-semibold text-[#D4A63A] mt-0.5">{roleDisplay}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111010] p-6 shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#D4A63A]" />
                  <span>Security & Session</span>
                </h3>
                <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                  Your session is protected with secure HTTP-only cookie authentication and automatic token rotation.
                </p>

                <div className="mt-4 rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-neutral-300 space-y-2">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Role-Based Access Control verified</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Cross-Site Request Forgery protected</span>
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-bold text-red-300 hover:bg-red-500/20 transition"
              >
                <LogOut size={17} />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </section>
        )}

      </div>
    </main>
  )
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
