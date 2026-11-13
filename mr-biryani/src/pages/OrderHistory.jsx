import { getOrdersByEmail } from '../data/orderData'
import { getCurrentUser } from '../utils/auth'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Search,
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  Phone,
  CalendarDays,
  Receipt,
  Utensils,
  RefreshCw,
  Bike,
  Package,
} from 'lucide-react'

import { getOrders } from '../data/orderData'

const filters = [
  'All Orders',
  'Active',
  'Past Orders',
  'Pending',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
]

const statusConfig = {
  Pending: {
    icon: Clock,
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  },
  Confirmed: {
    icon: CheckCircle2,
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  Preparing: {
    icon: ChefHat,
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  },
  'Out for Delivery': {
    icon: Bike,
    className: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
  },
  Delivered: {
    icon: PackageCheck,
    className: 'border-green-500/30 bg-green-500/10 text-green-400',
  },
  Cancelled: {
    icon: XCircle,
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
}

const progressSteps = [
  { label: 'Placed', icon: Receipt },
  { label: 'Confirmed', icon: CheckCircle2 },
  { label: 'Preparing', icon: ChefHat },
  { label: 'On the way', icon: Bike },
  { label: 'Delivered', icon: PackageCheck },
]

const getStatusIndex = (status) => {
  const statusIndexes = {
    Pending: 0,
    Confirmed: 1,
    Preparing: 2,
    'Out for Delivery': 3,
    Delivered: 4,
  }

  return statusIndexes[status] ?? -1
}

const formatPrice = (price = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(price) || 0)

const formatDate = (date) => {
  if (!date) return 'Date unavailable'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadOrders = (email) => {
  try {
    if (!email) return []

    const result = getOrdersByEmail(email)
    return Array.isArray(result) ? result : []
  } catch (error) {
    console.error('Unable to load customer orders:', error)
    return []
  }
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.Pending
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${config.className}`}
    >
      <Icon size={14} />
      {status || 'Pending'}
    </span>
  )
}

function OrderProgress({ status }) {
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <XCircle className="shrink-0 text-red-400" size={22} />
        <div>
          <p className="text-sm font-bold text-red-400">
            Order Cancelled
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            This order is no longer being processed.
          </p>
        </div>
      </div>
    )
  }

  const activeIndex = getStatusIndex(status)

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Order Progress</p>
        <span className="text-xs font-semibold text-[#D4A63A]">
          {status || 'Pending'}
        </span>
      </div>

      <div className="flex items-start">
        {progressSteps.map((step, index) => {
          const Icon = step.icon
          const completed = index <= activeIndex

          return (
            <div
              key={step.label}
              className="relative flex flex-1 flex-col items-center"
            >
              {index !== 0 && (
                <div
                  className={`absolute right-1/2 top-4 h-0.5 w-full ${
                    index <= activeIndex
                      ? 'bg-[#D4A63A]'
                      : 'bg-white/10'
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${
                  completed
                    ? 'border-[#D4A63A] bg-[#D4A63A] text-black'
                    : 'border-white/15 bg-[#211912] text-neutral-500'
                }`}
              >
                <Icon size={14} />
              </div>

              <span
                className={`mt-2 text-center text-[9px] leading-3 sm:text-[10px] ${
                  completed ? 'text-[#D4A63A]' : 'text-neutral-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OrderHistory() {
const currentUser = getCurrentUser()

  const [orders, setOrders] = useState(() =>
    loadOrders(currentUser?.email)
  )

  const [activeFilter, setActiveFilter] = useState('All Orders')
  const [search, setSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState(null)

  const activeOrders = orders.filter((order) =>
    ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(
      order.orderStatus
    )
  )

  const deliveredCount = orders.filter(
    (order) => order.orderStatus === 'Delivered'
  ).length

  const totalSpent = orders
    .filter((order) => order.orderStatus !== 'Cancelled')
    .reduce(
      (total, order) => total + Number(order.pricing?.total || 0),
      0
    )

  const filteredOrders = useMemo(() => {
    const searchText = search.toLowerCase().trim()

    return orders
      .filter((order) => {
        const status = order.orderStatus || 'Pending'

        let matchesFilter = true

        if (activeFilter === 'Active') {
          matchesFilter = [
            'Pending',
            'Confirmed',
            'Preparing',
            'Out for Delivery',
          ].includes(status)
        } else if (activeFilter === 'Past Orders') {
          matchesFilter = ['Delivered', 'Cancelled'].includes(status)
        } else if (activeFilter !== 'All Orders') {
          matchesFilter = status === activeFilter
        }

        const matchesSearch =
          !searchText ||
          order.orderId?.toLowerCase().includes(searchText) ||
          order.customer?.name?.toLowerCase().includes(searchText) ||
          order.items?.some((item) =>
            item.name?.toLowerCase().includes(searchText)
          )

        return matchesFilter && matchesSearch
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
  }, [orders, activeFilter, search])

const refreshOrders = () => {
  setOrders(loadOrders(currentUser?.email))
}

  return (
    <main className="min-h-screen bg-[#0b0705] text-white">

      {/* PAGE HEADER */}
      <section className="relative overflow-hidden border-b border-[#D4A63A]/20 bg-gradient-to-br from-[#241208] via-[#140c08] to-[#0b0705]">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#D4A63A]/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-red-900/20 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-16">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div>
              <Link
                to="/"
                className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 transition hover:text-[#D4A63A]"
              >
                Home <span>/</span> My Orders
              </Link>

              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
                <ShoppingBag size={16} />
                Customer Account
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                My <span className="text-[#D4A63A]">Orders</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
                Your favourite Andhra flavours, all in one place.
                Track your orders and revisit your favourite meals.
              </p>
            </div>

            <Link
              to="/order"
              className="inline-flex items-center justify-center gap-3 self-start rounded-xl bg-[#D4A63A] px-6 py-3.5 font-bold text-black shadow-lg shadow-[#D4A63A]/10 transition duration-300 hover:-translate-y-1 hover:bg-[#E8BD57] md:self-auto"
            >
              <Utensils size={18} />
              Order Food
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* CUSTOMER SUMMARY */}
      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-[#D4A63A]/20 bg-gradient-to-br from-[#24180e] to-[#17100c] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                Total Orders
              </span>
              <ShoppingBag className="text-[#D4A63A]" size={22} />
            </div>
            <p className="mt-4 text-3xl font-black">{orders.length}</p>
            <p className="mt-1 text-xs text-neutral-500">
              All your purchases
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/15 bg-[#17100c] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                Active Orders
              </span>
              <Clock className="text-orange-400" size={22} />
            </div>
            <p className="mt-4 text-3xl font-black">{activeOrders.length}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Currently processing
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/15 bg-[#17100c] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                Delivered
              </span>
              <PackageCheck className="text-green-400" size={22} />
            </div>
            <p className="mt-4 text-3xl font-black">{deliveredCount}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Successfully delivered
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#17100c] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">
                Total Order Value
              </span>
              <Receipt className="text-[#D4A63A]" size={22} />
            </div>
            <p className="mt-4 text-2xl font-black text-[#D4A63A]">
              {formatPrice(totalSpent)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Excluding cancelled orders
            </p>
          </div>

        </div>
      </section>

      {/* ORDER HISTORY */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
              Order Activity
            </p>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Your Recent <span className="text-[#D4A63A]">Orders</span>
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              View your purchases and check order progress.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshOrders}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-[#D4A63A]/50 hover:text-[#D4A63A] sm:self-auto"
          >
            <RefreshCw size={16} />
            Refresh Orders
          </button>
        </div>

        {/* SEARCH */}
        <div className="mb-5 flex items-center rounded-xl border border-white/10 bg-[#17100c] px-4 transition focus-within:border-[#D4A63A]/60">
          <Search size={19} className="shrink-0 text-[#D4A63A]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order ID, food or customer name..."
            className="w-full bg-transparent px-3 py-4 text-sm text-white outline-none placeholder:text-neutral-500"
          />
        </div>

        {/* FILTERS */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition duration-300 ${
                activeFilter === filter
                  ? 'border-[#D4A63A] bg-[#D4A63A] text-black'
                  : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-[#D4A63A]/50 hover:text-[#D4A63A]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#17100c] px-5 py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D4A63A]/20 bg-[#D4A63A]/10">
              <Package size={34} className="text-[#D4A63A]" />
            </div>

            <h3 className="mt-6 text-xl font-bold">
              {orders.length === 0
                ? 'Your Food Journey Starts Here!'
                : 'No Orders Found'}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-400">
              {orders.length === 0
                ? 'You have not placed an order yet. Explore our menu and enjoy authentic Andhra-style biryani.'
                : 'We could not find any orders matching your search or selected filter.'}
            </p>

            {orders.length === 0 ? (
              <Link
                to="/order"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D4A63A] px-6 py-3 font-bold text-black transition hover:bg-[#E8BD57]"
              >
                Explore Our Menu
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setActiveFilter('All Orders')
                }}
                className="mt-6 rounded-xl border border-[#D4A63A]/40 px-5 py-3 text-sm font-semibold text-[#D4A63A] transition hover:bg-[#D4A63A]/10"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order, orderIndex) => {
              const orderKey = order.orderId || `order-${orderIndex}`
              const isExpanded = expandedOrder === orderKey
              const items = Array.isArray(order.items) ? order.items : []

              return (
                <article
                  key={orderKey}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#17100c] transition duration-300 hover:border-[#D4A63A]/30"
                >
                  {/* ORDER CARD */}
                  <div className="p-5 sm:p-6">

                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                          Order ID
                        </p>
                        <h3 className="mt-1 break-all text-sm font-bold text-white">
                          {order.orderId || 'Order ID unavailable'}
                        </h3>
                      </div>

                      <StatusBadge status={order.orderStatus} />
                    </div>

                    {/* FOOD ITEMS */}
                    <div className="space-y-4">
                      {items.slice(0, 2).map((item, index) => (
                        <div
                          key={`${item.productId || item.name}-${index}`}
                          className="flex items-center gap-4"
                        >
                          <img
                            src={
                              item.image ||
                              'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=200&q=80'
                            }
                            alt={item.name || 'Ordered food'}
                            className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">
                              {item.name || 'Food item'}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {item.quantity || 1} × {formatPrice(item.price)}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-[#D4A63A]">
                            {formatPrice(
                              item.itemTotal ??
                              Number(item.price || 0) * Number(item.quantity || 1)
                            )}
                          </p>
                        </div>
                      ))}

                      {items.length > 2 && (
                        <p className="pl-20 text-xs font-medium text-[#D4A63A]">
                          + {items.length - 2} more item(s)
                        </p>
                      )}

                      {items.length === 0 && (
                        <p className="text-sm text-neutral-500">
                          Item details are unavailable for this order.
                        </p>
                      )}
                    </div>

                    {/* ORDER META */}
                    <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <CalendarDays size={16} className="text-[#D4A63A]" />
                        {formatDate(order.createdAt)}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                        <span className="text-xs text-neutral-500">
                          Order Total
                        </span>
                        <span className="text-xl font-extrabold text-[#D4A63A]">
                          {formatPrice(order.pricing?.total)}
                        </span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrder(isExpanded ? null : orderKey)
                        }
                        aria-expanded={isExpanded}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:border-[#D4A63A]/50 hover:text-[#D4A63A] sm:flex-none"
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                        {isExpanded ? (
                          <ChevronUp size={17} />
                        ) : (
                          <ChevronDown size={17} />
                        )}
                      </button>

                      <Link
                        to="/order"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4A63A] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#E8BD57] sm:flex-none"
                      >
                        <RefreshCw size={16} />
                        Order Again
                      </Link>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS */}
                  {isExpanded && (
                    <div className="space-y-6 border-t border-white/10 bg-black/20 p-5 sm:p-6">

                      {/* TRACKING */}
                      <OrderProgress status={order.orderStatus || 'Pending'} />

                      <div className="grid gap-7 md:grid-cols-2">

                        {/* DELIVERY INFORMATION */}
                        <div>
                          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#D4A63A]">
                            <MapPin size={17} />
                            Delivery Information
                          </h4>

                          <div className="space-y-2 rounded-xl border border-white/10 bg-[#17100c] p-4">
                            <p className="text-sm font-semibold text-white">
                              {order.customer?.name || 'Customer'}
                            </p>
                            <p className="text-sm leading-6 text-neutral-400">
                              {order.customer?.address || 'Address unavailable'}
                            </p>
                            <p className="flex items-center gap-2 text-sm text-neutral-400">
                              <Phone size={14} className="text-[#D4A63A]" />
                              {order.customer?.phone || 'Phone unavailable'}
                            </p>
                          </div>
                        </div>

                        {/* PAYMENT INFORMATION */}
                        <div>
                          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#D4A63A]">
                            <Receipt size={17} />
                            Payment Information
                          </h4>

                          <div className="space-y-3 rounded-xl border border-white/10 bg-[#17100c] p-4">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="text-neutral-500">Method</span>
                              <span className="text-right font-medium text-white">
                                {order.payment?.method || 'Not selected'}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="text-neutral-500">Payment Status</span>
                              <span className="text-right font-medium text-[#D4A63A]">
                                {order.payment?.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PRICE BREAKDOWN */}
                      <div className="ml-auto max-w-md rounded-xl border border-white/10 bg-[#17100c] p-5">
                        <h4 className="mb-4 text-sm font-bold text-[#D4A63A]">
                          Bill Summary
                        </h4>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between text-neutral-400">
                            <span>Subtotal</span>
                            <span>{formatPrice(order.pricing?.subtotal)}</span>
                          </div>

                          <div className="flex justify-between text-neutral-400">
                            <span>Delivery Charge</span>
                            <span>
                              {formatPrice(order.pricing?.deliveryCharge)}
                            </span>
                          </div>

                          <div className="flex justify-between text-neutral-400">
                            <span>Discount</span>
                            <span>
                              -{formatPrice(order.pricing?.discount)}
                            </span>
                          </div>

                          <div className="flex justify-between border-t border-white/10 pt-4 text-base font-extrabold">
                            <span>Total</span>
                            <span className="text-[#D4A63A]">
                              {formatPrice(order.pricing?.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default OrderHistory
