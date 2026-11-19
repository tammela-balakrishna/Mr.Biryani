import { useCallback, useEffect, useState } from 'react'
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  RotateCcw,
  CheckCircle2,
  Search,
  Clock,
  X,
  FileText,
  ArrowRight,
  IndianRupee,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ordersApi, floorApi } from '../../api/staff'
import {
  useBranch,
  card,
  ghost,
  field,
  money,
  errorText,
  shortId,
  timeOf,
} from './shared'
import { Message, Shell, Empty } from './ui'

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash Tender', icon: Banknote, color: 'text-emerald-400' },
  { id: 'UPI', label: 'UPI / QR Scan', icon: QrCode, color: 'text-sky-400' },
  { id: 'CARD', label: 'Debit / Card', icon: CreditCard, color: 'text-amber-400' },
]

export default function CashierDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()

  const [served, setServed] = useState([])
  const [bills, setBills] = useState([])
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('ALL') // ALL, OPEN, PAID
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Current Checkout Bill & Order State
  const [bill, setBill] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [method, setMethod] = useState('CASH')
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [showRefund, setShowRefund] = useState(false)
  const [refund, setRefund] = useState({ paymentId: '', amount: '', reason: '' })

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const [allOrders, allBills, tableList] = await Promise.all([
        ordersApi.list(branchId).catch(() => []),
        ordersApi.bills(branchId).catch(() => []),
        hasPermission('tables.read') ? floorApi.tables(branchId).catch(() => []) : Promise.resolve([]),
      ])

      const billedOrderIds = new Set((allBills || []).map((b) => b.order_id || b.orderId))
      const servedUnbilled = (allOrders || []).filter(
        (o) => o.status === 'SERVED' && !billedOrderIds.has(o.id)
      )

      setServed(servedUnbilled)
      setBills(allBills || [])
      setTables(tableList || [])
      setOrders(allOrders || [])
    } catch (err) {
      setError(errorText(err, 'Could not load cashier operations.'))
    } finally {
      setLoading(false)
    }
  }, [branchId, hasPermission])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Table label helper
  const getTableLabel = (tableId) => {
    if (!tableId) return 'Takeaway / Counter'
    const found = tables.find((t) => t.id === tableId)
    return found ? found.label : 'Dining Table'
  }

  // Open existing bill
  const openBill = async (billId, orderId) => {
    setError('')
    setNotice('')
    setShowRefund(false)
    try {
      const b = await ordersApi.bill(branchId, billId)
      setBill(b)
      setAmount(String(b.due))

      const rec = await ordersApi.receipt(branchId, billId).catch(() => null)
      setReceipt(rec)

      const targetOrderId = orderId || b.orderId || b.order_id
      if (targetOrderId) {
        let ord = orders.find((o) => o.id === targetOrderId)
        if (!ord) {
          ord = await ordersApi.order(targetOrderId).catch(() => null)
        }
        setSelectedOrder(ord)
      }
    } catch (err) {
      setError(errorText(err, 'Could not open the bill.'))
    }
  }

  // Create bill for served order
  const createBill = async (orderId) => {
    setError('')
    setNotice('')
    setShowRefund(false)
    try {
      const created = await ordersApi.createBill(branchId, orderId)
      setBill(created)
      setAmount(String(created.due))

      let ord = orders.find((o) => o.id === orderId)
      if (!ord) {
        ord = await ordersApi.order(orderId).catch(() => null)
      }
      setSelectedOrder(ord)

      const rec = await ordersApi.receipt(branchId, created.id).catch(() => null)
      setReceipt(rec)
      setNotice(`Bill generated for order ${shortId(orderId)}. Ready for payment.`)
      await load()
    } catch (err) {
      setError(errorText(err, 'Could not create the bill.'))
    }
  }

  // Record tender payment
  const handlePayment = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setNotice('')
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid payment amount.')
      return
    }

    try {
      await ordersApi.pay(branchId, bill.id, method, numAmount)
      const updated = await ordersApi.bill(branchId, bill.id)
      setBill(updated)
      setAmount(String(updated.due))

      const rec = await ordersApi.receipt(branchId, bill.id)
      setReceipt(rec)
      setNotice(`Recorded payment of ₹${money(numAmount)} via ${method}.`)
      await load()
    } catch (err) {
      setError(errorText(err, 'Payment could not be recorded.'))
    }
  }

  // Request refund
  const handleRequestRefund = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setNotice('')
    if (!refund.paymentId || !refund.amount || !refund.reason.trim()) {
      setError('Please select a payment transaction, enter the refund amount, and provide a reason.')
      return
    }

    try {
      await ordersApi.requestRefund(
        branchId,
        refund.paymentId,
        Number(refund.amount),
        refund.reason.trim()
      )
      setRefund({ paymentId: '', amount: '', reason: '' })
      setShowRefund(false)
      setNotice('Refund request sent to Branch Manager for approval.')
      const rec = await ordersApi.receipt(branchId, bill.id)
      setReceipt(rec)
    } catch (err) {
      setError(errorText(err, 'The refund request could not be processed.'))
    }
  }

  // Mark table cleaning after settlement
  const handleTableCleaning = async (tableId, label) => {
    if (!tableId) return
    try {
      await floorApi.setTableStatus(branchId, tableId, 'CLEANING')
      setNotice(`Table ${label} marked for cleaning and turnaround.`)
      await load()
    } catch (err) {
      setError(errorText(err, 'Could not update table status.'))
    }
  }

  // Quick amount helper
  const setQuickAmount = (val) => {
    setAmount(String(val))
  }

  // Financial KPIs
  const openBills = bills.filter((b) => b.status === 'OPEN')
  const paidBills = bills.filter((b) => b.status === 'PAID')
  const totalCollectedToday = paidBills.reduce((acc, b) => acc + Number(b.paid ?? b.total ?? 0), 0)

  // Filtered bills list
  const filteredBills = bills.filter((b) => {
    if (filter === 'OPEN' && b.status !== 'OPEN') return false
    if (filter === 'PAID' && b.status !== 'PAID') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const billIdMatch = b.id?.toLowerCase().includes(q)
      const orderIdMatch = (b.order_id || b.orderId)?.toLowerCase().includes(q)
      const tableMatch = getTableLabel(
        orders.find((o) => o.id === (b.order_id || b.orderId))?.tableId
      ).toLowerCase().includes(q)
      return billIdMatch || orderIdMatch || tableMatch
    }
    return true
  })

  const currentTable = selectedOrder?.tableId
    ? tables.find((t) => t.id === selectedOrder.tableId)
    : null

  return (
    <Shell
      eyebrow="Cashier & Billing Terminal"
      title="Point of Sale (POS)"
      links={[['Manager Desk', '/dashboard']]}
    >
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />

      {/* KPI Overview */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className={`rounded-2xl border p-5 transition ${
            served.length > 0
              ? 'border-[#D4A63A] bg-gradient-to-br from-[#1d1610] to-[#111010] shadow-lg shadow-[#D4A63A]/10'
              : 'border-white/10 bg-[#111010]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Needs Billing
            </span>
            <AlertCircle className={`h-4 w-4 ${served.length > 0 ? 'text-[#D4A63A]' : 'text-neutral-500'}`} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${served.length > 0 ? 'text-[#D4A63A]' : 'text-white'}`}>
            {served.length}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Orders served, awaiting bill</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Open Bills
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">{openBills.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Pending full payment</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Settled Today
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{paidBills.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Closed & fully paid bills</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Register Total
            </span>
            <IndianRupee className="h-4 w-4 text-[#D4A63A]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#D4A63A]">₹{money(totalCollectedToday)}</p>
          <p className="mt-1 text-xs text-neutral-500">Collected today</p>
        </div>
      </section>

      {/* Main Terminal: Split into Orders/Register (Left) and Billing & Checkout (Right) */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Served Orders & Bills Register (5 cols) */}
        <section className="space-y-6 lg:col-span-5">
          {/* Section 1: Served Orders Ready to be Billed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#D4A63A]" />
                <h3 className="font-serif text-lg font-bold text-white">Served Orders</h3>
              </div>
              <span className="rounded-full bg-[#D4A63A]/15 px-2 py-0.5 text-xs font-bold text-[#E0B246]">
                {served.length} ready
              </span>
            </div>

            {served.length > 0 ? (
              <div className="space-y-2.5">
                {served.map((o) => {
                  const tableLabel = getTableLabel(o.tableId)
                  const itemsPreview = (o.items || [])
                    .map((it) => `${it.quantity}x ${it.name}`)
                    .slice(0, 2)
                    .join(', ')
                  const extraCount = (o.items || []).length > 2 ? ` +${(o.items || []).length - 2} more` : ''

                  return (
                    <div
                      key={o.id}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-[#D4A63A]/30 bg-gradient-to-br from-[#181410] to-[#100f0e] p-4 shadow-md transition hover:border-[#D4A63A]/60 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-[#D4A63A] px-2 py-0.5 text-xs font-bold text-black">
                            {tableLabel}
                          </span>
                          <span className="font-mono text-xs text-neutral-400">
                            {shortId(o.id)}
                          </span>
                        </div>
                        {itemsPreview ? (
                          <p className="line-clamp-1 text-xs text-neutral-300">
                            {itemsPreview}{extraCount}
                          </p>
                        ) : null}
                        <p className="font-mono text-sm font-bold text-[#E0B246]">
                          ₹{money(o.total)}
                        </p>
                      </div>

                      {hasPermission('billing.generate') ? (
                        <button
                          onClick={() => createBill(o.id)}
                          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-3.5 py-2 text-xs font-bold text-black shadow-md transition hover:brightness-110 active:scale-95"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Generate Bill</span>
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={`${card} py-4 text-center text-xs text-neutral-400`}>
                No served orders waiting for billing. All served orders have been billed!
              </div>
            )}
          </div>

          {/* Section 2: Bills Register & History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#D4A63A]" />
                <h3 className="font-serif text-lg font-bold text-white">Bills Register</h3>
              </div>
              <button
                onClick={() => load()}
                disabled={loading}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
                title="Refresh bills"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#D4A63A]' : ''}`} />
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  className={`${field} py-1.5 pl-8 pr-3 text-xs`}
                  placeholder="Search table, order, or bill ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  ['ALL', `All (${bills.length})`],
                  ['OPEN', `Unpaid (${openBills.length})`],
                  ['PAID', `Paid (${paidBills.length})`],
                ].map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      filter === f
                        ? 'bg-[#D4A63A] text-black font-semibold shadow-sm'
                        : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bills List */}
            <div className="space-y-2">
              {filteredBills.map((b) => {
                const orderId = b.order_id || b.orderId
                const orderObj = orders.find((o) => o.id === orderId)
                const tableLabel = getTableLabel(orderObj?.tableId)
                const isSelected = bill?.id === b.id
                const isPaid = b.status === 'PAID'

                return (
                  <div
                    key={b.id}
                    onClick={() => openBill(b.id, orderId)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-[#D4A63A] bg-gradient-to-r from-[#1c1611] to-[#121110] shadow-md shadow-[#D4A63A]/10'
                        : 'border-white/10 bg-[#111010] hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                          {tableLabel}
                        </span>
                        <span className="font-mono text-xs text-neutral-400">
                          {shortId(orderId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span>Total: ₹{money(b.total)}</span>
                        <span>•</span>
                        <span>Paid: ₹{money(b.paid ?? (isPaid ? b.total : 0))}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isPaid
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? 'bg-green-400' : 'bg-amber-400'}`} />
                        {isPaid ? 'Paid' : 'Open'}
                      </span>
                      <p className="mt-1 font-mono text-xs text-neutral-400">
                        {shortId(b.id)}
                      </p>
                    </div>
                  </div>
                )
              })}

              {filteredBills.length === 0 ? (
                <div className={`${card} py-6 text-center`}>
                  <Empty>
                    {search ? 'No bills matched your search.' : 'No bills found in this view.'}
                  </Empty>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Right Column: Active Bill & Checkout Terminal (7 cols) */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-[#D4A63A]" />
              <h3 className="font-serif text-xl font-bold text-white">Checkout & Terminal</h3>
            </div>
            {bill ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  bill.status === 'PAID'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${bill.status === 'PAID' ? 'bg-green-400' : 'bg-amber-400'}`} />
                {bill.status === 'PAID' ? 'Settled & Paid' : 'Awaiting Payment'}
              </span>
            ) : null}
          </div>

          {!bill ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#111010]/50 p-8 text-center">
              <Receipt className="h-12 w-12 text-neutral-600 mb-3" />
              <h4 className="font-serif text-lg font-bold text-neutral-300">No Active Bill Selected</h4>
              <p className="mt-1 max-w-sm text-xs text-neutral-500">
                Select an open bill from the register or click "Generate Bill" for any served order to start checkout.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header Box: Table & Order Info */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#171412] to-[#111010] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-xl font-bold text-white">
                        {getTableLabel(selectedOrder?.tableId)}
                      </span>
                      <span className="rounded-lg bg-[#D4A63A]/20 px-2 py-0.5 text-xs font-mono font-bold text-[#E0B246]">
                        Order {shortId(selectedOrder?.id || bill.orderId || bill.order_id)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      Bill Reference: {bill.id}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-neutral-400">Balance Due</p>
                    <p className={`font-mono text-2xl font-bold ${Number(bill.due) > 0 ? 'text-[#E0B246]' : 'text-green-400'}`}>
                      ₹{money(bill.due)}
                    </p>
                  </div>
                </div>

                {/* Itemized Order Breakdown */}
                {selectedOrder?.items && selectedOrder.items.length > 0 ? (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Ordered Delicacies
                    </p>
                    <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                      {selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-neutral-300">
                            <span className="font-bold text-[#D4A63A]">{it.quantity}x</span> {it.name}
                          </span>
                          <span className="font-mono text-neutral-400">
                            ₹{money(it.lineSubtotal ?? (Number(it.unitPrice) * it.quantity))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Financial Summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-xs">
                  <div>
                    <span className="text-neutral-500">Subtotal</span>
                    <p className="font-mono font-semibold text-white">₹{money(bill.subtotal)}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Taxes (GST)</span>
                    <p className="font-mono font-semibold text-white">₹{money(bill.taxTotal)}</p>
                  </div>
                  <div>
                    <span className="text-neutral-500">Paid So Far</span>
                    <p className="font-mono font-semibold text-emerald-400">₹{money(bill.paid)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Section (If Bill has Due Amount) */}
              {bill.status !== 'PAID' && Number(bill.due) > 0 && hasPermission('payments.collect') ? (
                <div className="rounded-2xl border border-[#D4A63A]/40 bg-gradient-to-b from-[#1b1714] to-[#111010] p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[#D4A63A]" />
                      <h4 className="font-serif text-lg font-bold text-white">Accept Tender</h4>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Amount Due: <span className="font-bold text-[#D4A63A]">₹{money(bill.due)}</span>
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => {
                      const Icon = m.icon
                      const isSelected = method === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition ${
                            isSelected
                              ? 'border-[#D4A63A] bg-[#D4A63A]/10 text-white font-bold shadow-md shadow-[#D4A63A]/10'
                              : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${m.color}`} />
                          <span className="text-xs">{m.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Amount Input with Quick Cash Chips */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Tender Amount (₹)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        className={`${field} font-mono text-lg font-bold text-[#E0B246]`}
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                        placeholder="0.00"
                        aria-label="Payment amount"
                      />
                      <button
                        type="button"
                        onClick={() => setQuickAmount(bill.due)}
                        className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-neutral-200 transition hover:bg-white/10"
                      >
                        Exact Due
                      </button>
                    </div>

                    {/* Quick currency chips for cash */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-neutral-500">Quick:</span>
                      {[100, 200, 500, 1000, 2000]
                        .filter((val) => val >= Number(bill.due) || val === 500)
                        .slice(0, 4)
                        .map((chipVal) => (
                          <button
                            key={chipVal}
                            type="button"
                            onClick={() => setQuickAmount(chipVal)}
                            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:bg-white/10"
                          >
                            ₹{chipVal}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Primary Collect Button */}
                  <button
                    onClick={handlePayment}
                    disabled={!amount || Number(amount) <= 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] py-3 text-sm font-bold text-black shadow-lg shadow-[#D4A63A]/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                  >
                    <span>Record {method} Payment of ₹{money(amount || 0)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {/* Bill Settled State & Post-Payment Actions */}
              {bill.status === 'PAID' ? (
                <div className="rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-950/30 to-[#111010] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-white">Bill Completely Settled</h4>
                      <p className="text-xs text-green-300/80">All payments received and recorded.</p>
                    </div>
                  </div>

                  {/* Table turnaround trigger */}
                  {currentTable ? (
                    <button
                      onClick={() => handleTableCleaning(currentTable.id, currentTable.label)}
                      className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 active:scale-95"
                    >
                      Release {currentTable.label} for Cleaning
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Thermal Receipt & Actions */}
              {receipt ? (
                <div className="rounded-2xl border border-white/10 bg-[#0d0c0c] p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-[#D4A63A]" />
                      <h4 className="font-serif text-lg font-bold text-white">Customer Receipt</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-white/10"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print</span>
                      </button>

                      {hasPermission('payments.refund') && receipt.payments?.length > 0 ? (
                        <button
                          onClick={() => setShowRefund(!showRefund)}
                          className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Refund</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Styled Receipt Paper */}
                  <div className="rounded-xl bg-white p-6 font-mono text-xs text-neutral-900 shadow-inner">
                    <div className="text-center space-y-0.5">
                      <h5 className="font-serif text-base font-black tracking-wide text-black uppercase">
                        Mr. Biryani
                      </h5>
                      <p className="text-[11px] text-neutral-600">House of Andhra Flavours</p>
                      <p className="text-[10px] text-neutral-500">Official Dining Receipt</p>
                    </div>

                    <div className="my-3 border-t border-dashed border-neutral-300" />

                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Order: {shortId(receipt.orderId)}</span>
                      <span>Table: {getTableLabel(selectedOrder?.tableId)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Bill: {shortId(receipt.billId)}</span>
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="my-3 border-t border-dashed border-neutral-300" />

                    {/* Ordered items if available */}
                    {selectedOrder?.items && selectedOrder.items.length > 0 ? (
                      <div className="space-y-1 py-1">
                        {selectedOrder.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span>{it.quantity}x {it.name}</span>
                            <span>₹{money(it.lineSubtotal ?? (Number(it.unitPrice) * it.quantity))}</span>
                          </div>
                        ))}
                        <div className="my-2 border-t border-dashed border-neutral-200" />
                      </div>
                    ) : null}

                    {/* Financial Totals */}
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{money(receipt.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST + SGST (5%):</span>
                        <span>₹{money(receipt.taxTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-black border-t border-neutral-300 pt-1">
                        <span>GRAND TOTAL:</span>
                        <span>₹{money(receipt.total)}</span>
                      </div>
                    </div>

                    <div className="my-3 border-t border-dashed border-neutral-300" />

                    {/* Payments Tendered */}
                    <div className="space-y-1 text-[11px]">
                      <p className="font-bold text-neutral-800">Payments Tendered:</p>
                      {receipt.payments?.map((p) => (
                        <div key={p.id} className="flex justify-between text-neutral-600">
                          <span>{p.method} ({timeOf(p.created_at || p.createdAt)})</span>
                          <span className="font-bold text-black">₹{money(p.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-neutral-800 border-t border-neutral-200 pt-1">
                        <span>Amount Paid:</span>
                        <span>₹{money(receipt.paid)}</span>
                      </div>
                      {Number(receipt.due) > 0 ? (
                        <div className="flex justify-between font-bold text-amber-700">
                          <span>Remaining Due:</span>
                          <span>₹{money(receipt.due)}</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Approved Refunds */}
                    {receipt.refunds && receipt.refunds.length > 0 ? (
                      <div className="mt-3 border-t border-dashed border-neutral-300 pt-2 text-[10px] text-red-600">
                        <p className="font-bold">Refunds Processed:</p>
                        {receipt.refunds.map((r) => (
                          <div key={r.id} className="flex justify-between">
                            <span>{r.reason || 'Customer refund'}</span>
                            <span>-₹{money(r.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="my-4 border-t border-dashed border-neutral-300" />
                    <p className="text-center text-[10px] text-neutral-500">
                      Thank you for dining with us! Come back soon.
                    </p>
                  </div>

                  {/* Refund Form Panel */}
                  {showRefund ? (
                    <form onSubmit={handleRequestRefund} className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-red-300">
                          Request Customer Refund
                        </h5>
                        <button type="button" onClick={() => setShowRefund(false)} className="text-neutral-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">Select Payment</label>
                          <select
                            className={field}
                            value={refund.paymentId}
                            onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}
                            required
                          >
                            <option value="">— Choose a payment —</option>
                            {receipt.payments?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.method} (₹{money(p.amount)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-neutral-400">Refund Amount (₹)</label>
                          <input
                            className={field}
                            inputMode="decimal"
                            value={refund.amount}
                            onChange={(e) => setRefund({ ...refund, amount: e.target.value.replace(/[^\d.]/g, '') })}
                            placeholder="Amount in ₹"
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs text-neutral-400">Reason for Refund</label>
                          <input
                            className={field}
                            value={refund.reason}
                            onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
                            placeholder="e.g. Overcharge, dish returned, duplicate payment"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowRefund(false)} className={ghost}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!refund.paymentId || !refund.amount || !refund.reason.trim()}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40"
                        >
                          Submit Refund Request
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </Shell>
  )
}
