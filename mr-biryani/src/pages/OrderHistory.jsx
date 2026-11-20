import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, RefreshCw, ShoppingBag, ArrowLeft, Utensils } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { useBranch } from './dashboards/shared'
import { api, ApiError } from '../api/client'
import { ordersApi } from '../api/staff'

const STATUS_STYLES = {
  PLACED: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  ACCEPTED: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  PREPARING: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  READY: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  SERVED: 'border-green-500/40 bg-green-500/10 text-green-300',
  COMPLETED: 'border-neutral-500/40 bg-neutral-500/10 text-neutral-300',
  CANCELLED: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
}

function OrderHistoryContent() {
  const { isStaff, hasPermission } = useAuth()
  const { branchId } = useBranch()

  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('ALL') // ALL, DINE_IN, ONLINE, ACTIVE

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let list = []
      // Staff with orders.read load the branch orders
      if (isStaff && hasPermission('orders.read')) {
        list = await ordersApi.list(branchId)
      } else if (hasPermission('orders.read_own')) {
        // Customers load their personal order history
        list = await api.get('/api/v1/orders')
      } else {
        // Fallback gracefully: try branch API then customer endpoint
        try {
          list = await ordersApi.list(branchId)
        } catch {
          list = await api.get('/api/v1/orders')
        }
      }
      setOrders(Array.isArray(list) ? list : [])
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Your current role does not have permission to view these order records. Please consult an Administrator.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not load orders. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [isStaff, hasPermission, branchId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders()
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    if (filterType === 'DINE_IN') return orders.filter((o) => Boolean(o.tableId))
    if (filterType === 'ONLINE') return orders.filter((o) => !o.tableId)
    if (filterType === 'ACTIVE') return orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))
    return orders
  }, [orders, filterType])

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Activity & Records</p>
              {isStaff && (
                <span className="rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#D4A63A]">
                  Staff Register
                </span>
              )}
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">
              Order <span className="text-[#D4A63A]">History</span>
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              {isStaff
                ? 'Overview of all dining table tickets, walk-ins, and online orders for your branch.'
                : 'All orders placed by your account with itemized breakdowns and real-time status.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isStaff && (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition"
              >
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </Link>
            )}
            <button
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D4A63A]/30 bg-[#141210] px-3.5 py-2 text-xs font-semibold text-[#D4A63A] transition hover:bg-[#D4A63A]/10 disabled:opacity-50"
              title="Refresh order register"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-[#D4A63A]' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-950/25 p-4 text-xs text-rose-300 space-y-2">
            <p className="font-semibold">{error}</p>
            {isStaff && (
              <Link to="/dashboard" className="inline-flex items-center gap-1 font-bold text-[#D4A63A] hover:underline">
                Return to your staff operations dashboard →
              </Link>
            )}
          </div>
        )}

        {/* Filter Pills */}
        {orders && orders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['ALL', `All Orders (${orders.length})`],
              ['DINE_IN', `🍽️ Dine-in Tables (${orders.filter((o) => o.tableId).length})`],
              ['ONLINE', `🛍️ Counter & Online (${orders.filter((o) => !o.tableId).length})`],
              ['ACTIVE', `⚡ Active (${orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length})`],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterType(val)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  filterType === val
                    ? 'bg-[#D4A63A] text-black font-bold shadow-md shadow-[#D4A63A]/20'
                    : 'border border-white/10 bg-[#111010] text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {orders === null && !error && (
          <div className="py-16 text-center text-sm text-neutral-400 space-y-2">
            <RefreshCw size={24} className="mx-auto animate-spin text-[#D4A63A]" />
            <p>Loading order history records…</p>
          </div>
        )}

        {/* Empty State */}
        {orders?.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#111010] p-10 text-center space-y-3">
            <ClipboardList size={42} className="mx-auto text-[#D4A63A]" />
            <h2 className="text-xl font-bold">No orders found</h2>
            <p className="mx-auto max-w-md text-xs text-neutral-400">
              {isStaff
                ? 'No tickets are logged in the branch register yet. New table tickets and walk-ins will appear here.'
                : 'You have not placed any orders yet. Explore our authentic Andhra menu to get started!'}
            </p>
            {!isStaff ? (
              <Link
                to="/menu"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-[#D4A63A]/20 transition hover:brightness-110"
              >
                <ShoppingBag size={14} />
                <span>Explore Menu</span>
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#D4A63A] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#E8BD57] transition"
              >
                <Utensils size={14} />
                <span>Open Operations Terminal</span>
              </Link>
            )}
          </div>
        )}

        {/* Filtered Empty State */}
        {orders?.length > 0 && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#111010] p-8 text-center text-xs text-neutral-400">
            No orders match the selected filter criteria.
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length > 0 && (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusClass = STATUS_STYLES[order.status] || 'border-neutral-500/30 text-neutral-400'
              const isTableOrder = Boolean(order.tableId)
              const orderRef = (order.id || '').slice(0, 8).toUpperCase()

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#13110f] to-[#0a0a0a] p-5 transition hover:border-[#D4A63A]/40 sm:p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-bold text-white">
                          Order #{orderRef}
                        </p>
                        {isTableOrder ? (
                          <span className="rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#E0B246]">
                            🍽️ Table #{order.tableId.slice(0, 8).toUpperCase()}
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            🛍️ Counter / Online
                          </span>
                        )}
                        {order.channel && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                            {order.channel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Recent'}
                      </p>
                    </div>

                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusClass}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {(order.items || []).map((item, idx) => (
                      <p key={(item.menuItemId || item.name) + idx} className="flex justify-between gap-3 text-xs text-neutral-300">
                        <span>
                          <span className="font-semibold text-white">{item.quantity}×</span> {item.name}
                        </span>
                        <span className="font-mono font-medium text-neutral-200">
                          ₹{Number(item.lineSubtotal || (item.unitPrice * item.quantity) || 0).toFixed(2)}
                        </span>
                      </p>
                    ))}
                  </div>

                  {/* Pricing footer */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
                    <span className="text-xs text-neutral-400">Total (incl. tax)</span>
                    <span className="font-mono text-base font-bold text-[#E0B246]">
                      ₹{Number(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

export default function OrderHistory() {
  return (
    <ProtectedRoute anyOf={['orders.read_own', 'orders.read']}>
      <OrderHistoryContent />
    </ProtectedRoute>
  )
}
