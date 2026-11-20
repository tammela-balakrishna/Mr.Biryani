import { useCallback, useEffect, useMemo, useState } from 'react'
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
  IndianRupee,
  AlertCircle,
  RefreshCw,
  Plus,
  ShoppingBag,
  Utensils,
  ChevronRight,
  Trash2,
  Check,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { ordersApi, floorApi, menuApi } from '../../api/staff'
import {
  useBranch,
  card,
  field,
  money,
  errorText,
  shortId,
  timeOf,
  DEFAULT_POS_MENU,
} from './shared'
import { Message, Shell } from './ui'

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash Tender', icon: Banknote, color: 'text-emerald-400' },
  { id: 'UPI', label: 'UPI / QR Scan', icon: QrCode, color: 'text-sky-400' },
  { id: 'CARD', label: 'Debit / Card', icon: CreditCard, color: 'text-amber-400' },
]

export default function CashierDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()

  // Terminal Collections
  const [bills, setBills] = useState([])
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [menuCatalog, setMenuCatalog] = useState(DEFAULT_POS_MENU)
  const [loading, setLoading] = useState(false)

  // View Navigation: 'UNBILLED' | 'TABLES' | 'BILLS'
  const [activeTab, setActiveTab] = useState('UNBILLED')
  const [unbilledFilter, setUnbilledFilter] = useState('ALL') // ALL, DINE_IN, TAKEAWAY, SERVED
  const [billsFilter, setBillsFilter] = useState('ALL') // ALL, OPEN, PAID
  const [search, setSearch] = useState('')

  // Current Checkout Bill & Order State
  const [bill, setBill] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [method, setMethod] = useState('CASH')
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [showRefund, setShowRefund] = useState(false)
  const [refund, setRefund] = useState({ paymentId: '', amount: '', reason: '' })

  // New Walk-in Order POS Modal State
  const [showNewWalkIn, setShowNewWalkIn] = useState(false)
  const [walkInOrderType, setWalkInOrderType] = useState('DINE_IN') // DINE_IN, TAKEAWAY
  const [walkInTableId, setWalkInTableId] = useState('')
  const [walkInCustomer, setWalkInCustomer] = useState('')
  const [walkInCategory, setWalkInCategory] = useState('ALL')
  const [walkInSearch, setWalkInSearch] = useState('')
  const [walkInItems, setWalkInItems] = useState({}) // { [id]: { menuItemId, name, price, quantity } }

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Load operations data
  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    try {
      const [allOrders, allBills, tableList, menuRes] = await Promise.all([
        ordersApi.list(branchId).catch(() => []),
        ordersApi.bills(branchId).catch(() => []),
        hasPermission('tables.read') ? floorApi.tables(branchId).catch(() => []) : Promise.resolve([]),
        menuApi.list().catch(() => null),
      ])

      setBills(allBills || [])
      setTables(tableList || [])
      setOrders(allOrders || [])

      if (menuRes?.categories && Array.isArray(menuRes.categories) && menuRes.categories.length > 0) {
        setMenuCatalog(menuRes.categories)
      } else if (menuRes && Array.isArray(menuRes) && menuRes.length > 0) {
        setMenuCatalog(menuRes)
      } else if (menuRes?.data && Array.isArray(menuRes.data) && menuRes.data.length > 0) {
        setMenuCatalog(menuRes.data)
      }
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

  const currentTab = activeTab === 'TABLES' && !hasPermission('tables.read') ? 'UNBILLED' : activeTab

  // Table label helper
  const getTableLabel = useCallback(
    (tableId) => {
      if (!tableId) return 'Counter / Takeaway'
      const found = tables.find((t) => t.id === tableId)
      return found ? found.label : 'Dining Table'
    },
    [tables]
  )

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

  // Create bill for order
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

  // Mark table available
  const handleTableAvailable = async (tableId, label) => {
    if (!tableId) return
    try {
      await floorApi.setTableStatus(branchId, tableId, 'AVAILABLE')
      setNotice(`Table ${label} is now available for walk-in seating.`)
      await load()
    } catch (err) {
      setError(errorText(err, 'Could not update table status.'))
    }
  }

  // Quick amount helper
  const setQuickAmount = (val) => {
    setAmount(String(val))
  }

  // Dedicated thermal receipt printer (prints ONLY the receipt, not the webpage)
  const handlePrintReceipt = () => {
    const receiptEl = document.getElementById('thermal-receipt')
    if (!receiptEl) {
      window.print()
      return
    }

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt_${shortId(receipt?.billId || bill?.id || 'Bill')}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm 2mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.35;
              width: 74mm;
            }
            * { box-sizing: border-box; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: 'Courier New', Courier, monospace; }
            .flex { display: flex; justify-content: space-between; align-items: baseline; }
            .border-t { border-top: 1px dashed #333; }
            .my-2 { margin: 6px 0; }
            .my-3 { margin: 8px 0; }
            .my-4 { margin: 12px 0; }
            .py-1 { padding: 3px 0; }
            .pt-1 { padding-top: 4px; }
            .pt-2 { padding-top: 6px; }
            .space-y-1 > * + * { margin-top: 3px; }
            .text-sm { font-size: 13px; }
            .text-xs { font-size: 10px; }
            .text-lg { font-size: 16px; }
          </style>
        </head>
        <body>
          ${receiptEl.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow.focus()
    setTimeout(() => {
      iframe.contentWindow.print()
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 1500)
    }, 250)
  }

  // Flattened menu items for Walk-in POS punching
  const flattenedMenuItems = useMemo(() => {
    const list = []
    for (const cat of menuCatalog) {
      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          list.push({ ...item, categoryName: cat.category || cat.name || 'Dishes' })
        }
      } else {
        list.push({ ...cat, categoryName: cat.category || 'Dishes' })
      }
    }
    return list
  }, [menuCatalog])

  const menuCategories = useMemo(() => {
    const set = new Set(['ALL'])
    flattenedMenuItems.forEach((it) => {
      if (it.categoryName) set.add(it.categoryName)
    })
    return Array.from(set)
  }, [flattenedMenuItems])

  // Filtered menu items for the walk-in modal
  const filteredCatalogItems = useMemo(() => {
    return flattenedMenuItems.filter((it) => {
      if (walkInCategory !== 'ALL' && it.categoryName !== walkInCategory) return false
      if (walkInSearch.trim()) {
        const q = walkInSearch.toLowerCase()
        const nameMatch = it.name?.toLowerCase().includes(q)
        const descMatch = it.description?.toLowerCase().includes(q)
        return nameMatch || descMatch
      }
      return true
    })
  }, [flattenedMenuItems, walkInCategory, walkInSearch])

  // Walk-in order item add/remove
  const addItemToWalkIn = (item) => {
    setWalkInItems((prev) => {
      const existing = prev[item.id]
      const qty = (existing?.quantity || 0) + 1
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: qty,
        },
      }
    })
  }

  const removeItemFromWalkIn = (itemId) => {
    setWalkInItems((prev) => {
      const existing = prev[itemId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const clearWalkInItems = (itemId) => {
    setWalkInItems((prev) => {
      const copy = { ...prev }
      delete copy[itemId]
      return copy
    })
  }

  // Walk-in ticket totals
  const walkInSubtotal = useMemo(() => {
    return Object.values(walkInItems).reduce((acc, it) => acc + it.price * it.quantity, 0)
  }, [walkInItems])
  const walkInTax = Math.round(walkInSubtotal * 0.05 * 100) / 100
  const walkInTotal = walkInSubtotal + walkInTax

  // Submit Walk-in order (either Place & Bill Immediately, or Send to Kitchen)
  const handleCreateWalkInOrder = async (billImmediately = false) => {
    setError('')
    setNotice('')
    const lines = Object.values(walkInItems).map((it) => ({
      menuItemId: it.menuItemId,
      quantity: it.quantity,
    }))

    if (lines.length === 0) {
      setError('Please add at least one dish to the walk-in ticket.')
      return
    }

    if (walkInOrderType === 'DINE_IN' && !walkInTableId) {
      setError('Please select a dining table for the seated walk-in guest.')
      return
    }

    try {
      setLoading(true)
      const cleanTableId = walkInOrderType === 'DINE_IN' && walkInTableId && walkInTableId !== 'null' && walkInTableId !== 'undefined' && walkInTableId.trim() !== '' ? walkInTableId.trim() : null
      const payload = {
        tableId: cleanTableId,
        items: lines,
      }

      const res = await ordersApi.create(branchId, payload)
      const createdOrder = res?.data || res

      // If dine-in, mark table as OCCUPIED
      if (walkInOrderType === 'DINE_IN' && walkInTableId) {
        await floorApi.setTableStatus(branchId, walkInTableId, 'OCCUPIED').catch(() => null)
      }

      // Reset modal form
      setShowNewWalkIn(false)
      setWalkInItems({})
      setWalkInTableId('')
      setWalkInCustomer('')

      if (billImmediately && createdOrder?.id) {
        // Immediately generate bill and open checkout
        await createBill(createdOrder.id)
        setNotice(
          `Walk-in order created & bill generated for ${walkInOrderType === 'DINE_IN' ? getTableLabel(walkInTableId) : 'Counter'
          }. Ready for payment.`
        )
      } else {
        setNotice(
          `Walk-in order sent to kitchen for ${walkInOrderType === 'DINE_IN' ? getTableLabel(walkInTableId) : 'Takeaway Counter'
          }.`
        )
        await load()
      }
    } catch (err) {
      setError(errorText(err, 'Could not create walk-in order.'))
    } finally {
      setLoading(false)
    }
  }

  // All unbilled orders across the branch (Walk-ins & Online)
  const billedOrderIds = useMemo(() => {
    return new Set((bills || []).map((b) => b.order_id || b.orderId))
  }, [bills])

  const unbilledOrders = useMemo(() => {
    return (orders || []).filter(
      (o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && !billedOrderIds.has(o.id)
    )
  }, [orders, billedOrderIds])

  // Filtered unbilled list based on sub-tabs
  const filteredUnbilled = useMemo(() => {
    return unbilledOrders.filter((o) => {
      if (unbilledFilter === 'DINE_IN' && !o.tableId) return false
      if (unbilledFilter === 'TAKEAWAY' && o.tableId) return false
      if (unbilledFilter === 'SERVED' && o.status !== 'SERVED') return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const orderIdMatch = o.id?.toLowerCase().includes(q)
        const tableMatch = getTableLabel(o.tableId).toLowerCase().includes(q)
        return orderIdMatch || tableMatch
      }
      return true
    })
  }, [unbilledOrders, unbilledFilter, search, getTableLabel])

  // Occupied tables with active order summary
  const occupiedTables = useMemo(() => {
    return tables.filter((t) => t.status === 'OCCUPIED')
  }, [tables])

  // Bills statistics
  const openBills = useMemo(() => bills.filter((b) => b.status === 'OPEN'), [bills])
  const paidBills = useMemo(() => bills.filter((b) => b.status === 'PAID'), [bills])
  const totalCollectedToday = useMemo(() => {
    return paidBills.reduce((acc, b) => acc + Number(b.paid ?? b.total ?? 0), 0)
  }, [paidBills])

  // Filtered bills list
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (billsFilter === 'OPEN' && b.status !== 'OPEN') return false
      if (billsFilter === 'PAID' && b.status !== 'PAID') return false
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
  }, [bills, billsFilter, search, orders, getTableLabel])

  // Active table helper
  const currentTable = selectedOrder?.tableId
    ? tables.find((t) => t.id === selectedOrder.tableId)
    : null

  // Status badge styling
  const orderStatusBadge = (status) => {
    switch (status) {
      case 'SERVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      case 'READY':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30'
      case 'PREPARING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700'
    }
  }

  return (
    <Shell
      eyebrow="Cashier & Billing Terminal"
      title="Point of Sale (POS)"
      links={hasPermission('roles.manage') ? [['Admin', '/admin']] : []}
    >
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />

      {/* Top Action Bar & KPI Overview */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
              <span>Walk-in Billing & Till Operations</span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                Live POS
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Bill seated walk-in table guests, punch counter takeaway orders, and tender multi-mode payments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition"
              title="Refresh register"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#D4A63A]' : ''}`} />
              <span>Refresh</span>
            </button>

            {hasPermission('orders.create') && (
              <button
                onClick={() => {
                  setShowNewWalkIn(true)
                  setWalkInOrderType('DINE_IN')
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-4 py-2 text-xs font-bold text-black shadow-lg shadow-[#D4A63A]/20 transition hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>+ New Walk-in Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Financial & Operational KPI Cards */}
        <div className={`grid gap-4 sm:grid-cols-2 ${hasPermission('tables.read') ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          <div
            onClick={() => setActiveTab('UNBILLED')}
            className={`cursor-pointer rounded-2xl border p-5 transition ${unbilledOrders.length > 0
              ? 'border-[#D4A63A] bg-gradient-to-br from-[#1d1610] to-[#111010] shadow-lg shadow-[#D4A63A]/10'
              : 'border-white/10 bg-[#111010]'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Unbilled Walk-ins
              </span>
              <AlertCircle className={`h-4 w-4 ${unbilledOrders.length > 0 ? 'text-[#D4A63A]' : 'text-neutral-500'}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${unbilledOrders.length > 0 ? 'text-[#D4A63A]' : 'text-white'}`}>
              {unbilledOrders.length}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Orders placed, ready for bill</p>
          </div>

          {hasPermission('tables.read') && (
            <div
              onClick={() => setActiveTab('TABLES')}
              className="cursor-pointer rounded-2xl border border-white/10 bg-[#111010] p-5 hover:border-[#D4A63A]/50 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Occupied Tables
                </span>
                <Utensils className="h-4 w-4 text-[#E0B246]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-[#E0B246]">{occupiedTables.length}</p>
              <p className="mt-1 text-xs text-neutral-500">Seated walk-in dining tables</p>
            </div>
          )}

          <div
            onClick={() => setActiveTab('BILLS')}
            className="cursor-pointer rounded-2xl border border-white/10 bg-[#111010] p-5 hover:border-amber-400/50 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Open Bills
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-400">{openBills.length}</p>
            <p className="mt-1 text-xs text-neutral-500">Awaiting tender completion</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111010] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Till Revenue Today
              </span>
              <IndianRupee className="h-4 w-4 text-[#D4A63A]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#D4A63A]">₹{money(totalCollectedToday)}</p>
            <p className="mt-1 text-xs text-neutral-500">{paidBills.length} bills settled</p>
          </div>
        </div>
      </section>

        {/* Main Terminal Split: Operations (Left) and Active Checkout & Thermal Receipt (Right) */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Unbilled Orders Queue, Seated Tables, Bills Register (5 cols) */}
          <section className="space-y-5 lg:col-span-5">
            {/* Navigation View Switcher Tabs */}
            <div className="flex rounded-xl border border-white/10 bg-black/60 p-1">
              <button
                onClick={() => setActiveTab('UNBILLED')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  currentTab === 'UNBILLED'
                    ? 'bg-[#D4A63A] text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Unbilled ({unbilledOrders.length})</span>
              </button>

              {hasPermission('tables.read') && (
                <button
                  onClick={() => setActiveTab('TABLES')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                    currentTab === 'TABLES'
                      ? 'bg-[#D4A63A] text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span>Tables ({occupiedTables.length})</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('BILLS')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  currentTab === 'BILLS'
                    ? 'bg-[#D4A63A] text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Bills Register ({bills.length})</span>
              </button>
            </div>

            {/* TAB 1: UNBILLED ORDERS QUEUE (Walk-in Dine-in & Counter Takeaways) */}
            {currentTab === 'UNBILLED' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#D4A63A]" />
                    <h3 className="font-serif text-lg font-bold text-white">Orders Awaiting Bill</h3>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {filteredUnbilled.length} orders
                  </span>
                </div>

                {/* Sub-filters for Walk-ins */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    ['ALL', `All (${unbilledOrders.length})`],
                    ['DINE_IN', `🍽️ Dine-in Tables (${unbilledOrders.filter((o) => o.tableId).length})`],
                    ['TAKEAWAY', `🛍️ Counter Parcel (${unbilledOrders.filter((o) => !o.tableId).length})`],
                    ['SERVED', `✓ Served (${unbilledOrders.filter((o) => o.status === 'SERVED').length})`],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setUnbilledFilter(val)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${unbilledFilter === val
                        ? 'bg-[#D4A63A] text-black font-semibold'
                        : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Order Cards List */}
                {filteredUnbilled.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredUnbilled.map((o) => {
                      const isDineIn = Boolean(o.tableId)
                      const tableLabel = getTableLabel(o.tableId)
                      const itemsPreview = (o.items || [])
                        .map((it) => `${it.quantity}x ${it.name}`)
                        .slice(0, 2)
                        .join(', ')
                      const extraCount =
                        (o.items || []).length > 2 ? ` +${(o.items || []).length - 2} more` : ''

                      return (
                        <div
                          key={o.id}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-[#D4A63A]/30 bg-gradient-to-br from-[#181410] to-[#100f0e] p-4 shadow-md transition hover:border-[#D4A63A]/70"
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-lg px-2 py-0.5 text-xs font-bold ${isDineIn
                                  ? 'bg-[#D4A63A] text-black'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  }`}
                              >
                                {isDineIn ? `🍽️ ${tableLabel}` : '🛍️ Counter Takeaway'}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${orderStatusBadge(
                                  o.status
                                )}`}
                              >
                                {o.status}
                              </span>
                              <span className="font-mono text-xs text-neutral-400">
                                {shortId(o.id)}
                              </span>
                            </div>

                            {itemsPreview ? (
                              <p className="line-clamp-1 text-xs text-neutral-300">
                                {itemsPreview}
                                {extraCount}
                              </p>
                            ) : null}

                            <p className="font-mono text-sm font-bold text-[#E0B246]">
                              ₹{money(o.total)}
                            </p>
                          </div>

                          {hasPermission('billing.generate') && (
                            <button
                              onClick={() => createBill(o.id)}
                              className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-4 py-2 text-xs font-bold text-black shadow-md transition hover:brightness-110 active:scale-95"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Bill Walk-in & Settle</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={`${card} py-8 text-center text-xs text-neutral-400 space-y-2`}>
                    <p>No unbilled walk-in orders currently waiting in this filter.</p>
                    {hasPermission('orders.create') && (
                      <button
                        onClick={() => {
                          setShowNewWalkIn(true)
                          setWalkInOrderType('DINE_IN')
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A63A] hover:underline"
                      >
                        <Plus size={14} /> Punch a Walk-in Order now
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* TAB 2: WALK-IN SEATED TABLES OVERVIEW */}
          {currentTab === 'TABLES' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-[#D4A63A]" />
                    <h3 className="font-serif text-lg font-bold text-white">Dining Tables Board</h3>
                  </div>
                  <span className="text-xs text-neutral-400">{tables.length} tables total</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {tables.map((tbl) => {
                    const activeOrder = orders.find(
                      (o) => o.tableId === tbl.id && o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
                    )
                    const existingBill = activeOrder
                      ? bills.find((b) => (b.order_id || b.orderId) === activeOrder.id)
                      : null

                    const isOccupied = tbl.status === 'OCCUPIED'
                    const isCleaning = tbl.status === 'CLEANING'

                    return (
                      <div
                        key={tbl.id}
                        className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${isOccupied
                          ? 'border-[#D4A63A]/50 bg-gradient-to-br from-[#1c1611] to-[#12100e] shadow-md'
                          : isCleaning
                            ? 'border-rose-500/30 bg-rose-950/15'
                            : 'border-white/10 bg-[#111010]'
                          }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{tbl.label}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${isOccupied
                                ? 'bg-[#D4A63A]/20 text-[#E0B246] border-[#D4A63A]/40'
                                : isCleaning
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                }`}
                            >
                              {tbl.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-400">
                            Capacity: {tbl.capacity || 4} guests
                          </p>

                          {activeOrder ? (
                            <div className="rounded-lg bg-black/40 p-2 border border-white/5 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-neutral-400">Ticket:</span>
                                <span className="font-mono font-bold text-[#E0B246]">
                                  ₹{money(activeOrder.total)}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-neutral-400">
                                <span>Status:</span>
                                <span className="font-semibold text-neutral-200">
                                  {activeOrder.status}
                                </span>
                              </div>
                            </div>
                          ) : isOccupied ? (
                            <p className="text-xs text-amber-300/80 italic">
                              Walk-in guest seated, awaiting ticket
                            </p>
                          ) : null}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                          {activeOrder ? (
                            existingBill ? (
                              <button
                                onClick={() => openBill(existingBill.id, activeOrder.id)}
                                className="w-full flex items-center justify-center gap-1 rounded-lg bg-[#D4A63A] py-1.5 text-xs font-bold text-black hover:bg-[#E8BD57]"
                              >
                                <Receipt size={13} /> Open Bill (₹{money(existingBill.due)})
                              </button>
                            ) : (
                              <button
                                onClick={() => createBill(activeOrder.id)}
                                className="w-full flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#E0B246] to-[#C39327] py-1.5 text-xs font-bold text-black hover:brightness-110"
                              >
                                <Receipt size={13} /> Bill Table Now
                              </button>
                            )
                          ) : isOccupied ? (
                            <button
                              onClick={() => {
                                setWalkInTableId(tbl.id)
                                setWalkInOrderType('DINE_IN')
                                setShowNewWalkIn(true)
                              }}
                              className="w-full flex items-center justify-center gap-1 rounded-lg border border-[#D4A63A]/40 bg-[#D4A63A]/10 py-1.5 text-xs font-semibold text-[#E0B246] hover:bg-[#D4A63A]/20"
                            >
                              <Plus size={13} /> Take Walk-in Order
                            </button>
                          ) : isCleaning ? (
                            <button
                              onClick={() => handleTableAvailable(tbl.id, tbl.label)}
                              className="w-full flex items-center justify-center gap-1 rounded-lg bg-emerald-600/80 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                            >
                              <Check size={13} /> Mark Table Ready
                            </button>
                          ) : null}

                          {isOccupied && (!activeOrder || (existingBill && existingBill.status === 'PAID')) && (
                            <button
                              onClick={() => handleTableCleaning(tbl.id, tbl.label)}
                              className="w-full flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-1 text-[11px] text-neutral-300 hover:bg-white/10"
                            >
                              <RotateCcw size={12} /> Release for Cleaning
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          {/* TAB 3: BILLS REGISTER & HISTORY */}
          {currentTab === 'BILLS' && (
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
                        onClick={() => setBillsFilter(f)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${billsFilter === f
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
                    const isDineIn = Boolean(orderObj?.tableId)
                    const tableLabel = getTableLabel(orderObj?.tableId)
                    const isSelected = bill?.id === b.id
                    const isPaid = b.status === 'PAID'

                    return (
                      <div
                        key={b.id}
                        onClick={() => openBill(b.id, orderId)}
                        className={`group flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${isSelected
                          ? 'border-[#D4A63A] bg-[#1a1612] shadow-md ring-1 ring-[#D4A63A]/40'
                          : 'border-white/10 bg-[#111010] hover:border-white/20'
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isDineIn ? 'bg-[#D4A63A] text-black' : 'bg-neutral-800 text-neutral-300'
                                }`}
                            >
                              {tableLabel}
                            </span>
                            <span className="font-mono text-xs text-neutral-400">
                              {shortId(b.id)}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-neutral-300">
                            Total: ₹{money(b.total)} {isPaid ? '' : `• Due: ₹${money(b.due)}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                          >
                            {b.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-neutral-500 group-hover:text-white" />
                        </div>
                      </div>
                    )
                  })}

                  {filteredBills.length === 0 && (
                    <div className={`${card} py-6 text-center text-xs text-neutral-400`}>
                      No bills match the selected filter.
                    </div>
                  )}
                </div>
              </div>
            )}
      </section>

      {/* Right Column: Active Checkout Bill & Thermal Receipt (7 cols) */}
      <section className="space-y-6 lg:col-span-7">
        {bill ? (
          <div className="space-y-6">
            {/* Bill Details Header Card */}
            <div className="rounded-2xl border border-[#D4A63A]/40 bg-gradient-to-br from-[#17130f] to-[#0f0e0d] p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#D4A63A]">
                    Active Settlement Bill
                  </span>
                  <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                    <span>{shortId(bill.id)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${bill.status === 'PAID'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                    >
                      {bill.status}
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-3 py-1.5 text-xs font-bold text-[#E0B246] hover:bg-[#D4A63A]/20 transition shadow-sm"
                  >
                    <Printer size={14} /> Print Receipt
                  </button>
                  <button
                    onClick={() => {
                      setBill(null)
                      setSelectedOrder(null)
                      setReceipt(null)
                    }}
                    className="rounded-lg p-1.5 text-neutral-400 hover:text-white"
                    title="Close bill"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Walk-in Customer & Table Info */}
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl bg-black/40 p-3 border border-white/5">
                  <span className="text-neutral-400 block mb-0.5">Order Type & Table</span>
                  <p className="font-bold text-white">
                    {selectedOrder?.tableId
                      ? `🍽️ Dine-in • ${getTableLabel(selectedOrder.tableId)}`
                      : '🛍️ Counter Takeaway'}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/5">
                  <span className="text-neutral-400 block mb-0.5">Order Reference</span>
                  <p className="font-mono font-bold text-[#E0B246]">
                    {selectedOrder?.id ? shortId(selectedOrder.id) : shortId(bill.orderId || bill.order_id)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/5">
                  <span className="text-neutral-400 block mb-0.5">Remaining Balance</span>
                  <p className={`font-mono font-bold ${Number(bill.due) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ₹{money(bill.due)}
                  </p>
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              {selectedOrder?.items && selectedOrder.items.length > 0 && (
                <div className="rounded-xl bg-black/30 p-3.5 border border-white/5 space-y-2">
                  <span className="text-xs font-semibold text-neutral-300 block">Itemized Food Ticket</span>
                  <div className="divide-y divide-white/5 text-xs">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5">
                        <span className="text-neutral-200">
                          <span className="font-bold text-[#E0B246] mr-2">{it.quantity}x</span>
                          {it.name}
                        </span>
                        <span className="font-mono text-neutral-300">
                          ₹{money(it.lineSubtotal ?? (Number(it.unitPrice) * it.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              <div className="rounded-xl bg-black/50 p-3.5 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Food Subtotal:</span>
                  <span className="font-mono text-neutral-200">₹{money(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Taxes (CGST + SGST 5%):</span>
                  <span className="font-mono text-neutral-200">₹{money(bill.tax_total ?? bill.taxTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/10">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-[#E0B246]">₹{money(bill.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Tender Form (Shown if balance due > 0) */}
            {Number(bill.due) > 0 ? (
              hasPermission('payments.collect') && (
                <form
                  onSubmit={handlePayment}
                  className="rounded-2xl border border-white/10 bg-[#111010] p-5 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-[#D4A63A]" />
                      <span>Tender Payment for Walk-in Bill</span>
                    </h4>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      Due: ₹{money(bill.due)}
                    </span>
                  </div>

                  {/* Method Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-400">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const Icon = m.icon
                        const active = method === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition ${active
                              ? 'border-[#D4A63A] bg-[#D4A63A]/10 text-white ring-1 ring-[#D4A63A]'
                              : 'border-white/10 bg-[#080808] text-neutral-400 hover:text-white'
                              }`}
                          >
                            <Icon className={`h-5 w-5 ${m.color}`} />
                            <span className="text-xs font-bold">{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tender Amount Input & Quick Currency Chips */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-400">
                      Tender Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className={`${field} py-2.5 pl-8 text-base font-bold text-white`}
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>

                    {/* Quick Currency Chips */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setQuickAmount(bill.due)}
                        className="rounded-lg border border-[#D4A63A]/50 bg-[#D4A63A]/10 px-2.5 py-1 text-xs font-bold text-[#E0B246] hover:bg-[#D4A63A]/20"
                      >
                        Exact Due (₹{money(bill.due)})
                      </button>
                      {[100, 200, 500, 1000, 2000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuickAmount(val)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/10"
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !amount || Number(amount) <= 0}
                    className="w-full rounded-xl bg-gradient-to-r from-[#E0B246] via-[#D4A63A] to-[#C39327] py-3 text-sm font-bold text-black shadow-lg shadow-[#D4A63A]/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-40"
                  >
                    Record {method} Payment of ₹{money(amount || 0)}
                  </button>
                </form>
              )
            ) : (
              /* Settled Card with Table Release Action */
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h4 className="font-serif text-base font-bold text-white">
                    Bill Fully Settled & Closed
                  </h4>
                </div>
                <p className="text-xs text-neutral-300">
                  Total ₹{money(bill.total)} has been paid in full. Receipt is ready to print.
                </p>

                {currentTable && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleTableCleaning(currentTable.id, currentTable.label)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition"
                    >
                      <RotateCcw size={14} /> Release {currentTable.label} & Send for Cleaning
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Thermal Printable Invoice Receipt */}
            {receipt && (
              <div className="space-y-3">
                <div className="flex items-center justify-between max-w-sm mx-auto px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Thermal POS Invoice (80mm)
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4A63A] px-3 py-1 text-xs font-bold text-black hover:bg-[#E8BD57] transition shadow-md"
                  >
                    <Printer size={13} /> Print
                  </button>
                </div>

                <div
                  id="thermal-receipt"
                  className="mx-auto max-w-sm rounded-xl border border-neutral-300 bg-white p-5 font-mono text-neutral-900 shadow-2xl"
                >
                  <div className="text-center space-y-1">
                    <h4 className="font-serif text-lg font-bold tracking-wider text-black">
                      MR. BIRIYANI
                    </h4>
                    <p className="text-[11px] font-semibold text-neutral-600">HOUSE OF ANDHRA FLAVOURS</p>
                    <p className="text-[10px] text-neutral-500">Official Dining & POS Receipt</p>
                  </div>

                  <div className="my-3 border-t border-dashed border-neutral-300" />

                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>Order: {shortId(receipt.orderId)}</span>
                    <span>Type: {selectedOrder?.tableId ? getTableLabel(selectedOrder.tableId) : 'Counter'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-600">
                    <span>Bill: {shortId(receipt.billId)}</span>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="my-3 border-t border-dashed border-neutral-300" />

                  {/* Ordered items */}
                  {selectedOrder?.items && selectedOrder.items.length > 0 && (
                    <div className="space-y-1 py-1">
                      {selectedOrder.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span>
                            {it.quantity}x {it.name}
                          </span>
                          <span>
                            ₹{money(it.lineSubtotal ?? Number(it.unitPrice) * it.quantity)}
                          </span>
                        </div>
                      ))}
                      <div className="my-2 border-t border-dashed border-neutral-200" />
                    </div>
                  )}

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
                        <span>
                          {p.method} ({timeOf(p.created_at || p.createdAt)})
                        </span>
                        <span className="font-bold text-black">₹{money(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-neutral-800 border-t border-neutral-200 pt-1">
                      <span>Amount Paid:</span>
                      <span>₹{money(receipt.paid)}</span>
                    </div>
                    {Number(receipt.due) > 0 && (
                      <div className="flex justify-between font-bold text-amber-700">
                        <span>Remaining Due:</span>
                        <span>₹{money(receipt.due)}</span>
                      </div>
                    )}
                  </div>

                  {/* Approved Refunds */}
                  {receipt.refunds && receipt.refunds.length > 0 && (
                    <div className="mt-3 border-t border-dashed border-neutral-300 pt-2 text-[10px] text-red-600">
                      <p className="font-bold">Refunds Processed:</p>
                      {receipt.refunds.map((r) => (
                        <div key={r.id} className="flex justify-between">
                          <span>{r.reason || 'Customer refund'}</span>
                          <span>-₹{money(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="my-4 border-t border-dashed border-neutral-300" />
                  <p className="text-center text-[10px] text-neutral-500">
                    Thank you for dining with Mr. Biryani! Come back soon.
                  </p>
                </div>

                {/* Refund Form Panel */}
                {showRefund ? (
                  <form
                    onSubmit={handleRequestRefund}
                    className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-red-300">
                        Request Customer Refund
                      </h5>
                      <button
                        type="button"
                        onClick={() => setShowRefund(false)}
                        className="text-neutral-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400">
                          Select Transaction
                        </label>
                        <select
                          className={`${field} py-1.5 text-xs mt-1`}
                          value={refund.paymentId}
                          onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}
                          required
                        >
                          <option value="">Choose payment to refund...</option>
                          {receipt.payments?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.method} • ₹{money(p.amount)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400">
                          Refund Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className={`${field} py-1.5 text-xs mt-1`}
                          value={refund.amount}
                          onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400">
                        Reason for Refund
                      </label>
                      <input
                        className={`${field} py-1.5 text-xs mt-1`}
                        placeholder="e.g. Guest returned dish / billing adjustment"
                        value={refund.reason}
                        onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition"
                    >
                      Submit Refund for Approval
                    </button>
                  </form>
                ) : (
                  hasPermission('payments.refund') &&
                  receipt.payments &&
                  receipt.payments.length > 0 && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowRefund(true)}
                        className="text-xs text-neutral-400 hover:text-red-400 transition"
                      >
                        Need to issue a refund?
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#111010]/50 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4A63A]/10 text-[#D4A63A] ring-1 ring-[#D4A63A]/30">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <h4 className="font-serif text-lg font-bold text-white">No Bill Selected</h4>
              <p className="mt-1 text-xs text-neutral-400 max-w-sm mx-auto">
                Select an unbilled walk-in order from the queue, click a seated dining table, or punch a new walk-in order to begin checkout.
              </p>
            </div>

            {hasPermission('orders.create') && (
              <button
                onClick={() => {
                  setShowNewWalkIn(true)
                  setWalkInOrderType('DINE_IN')
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-4 py-2.5 text-xs font-bold text-black shadow-md hover:brightness-110 active:scale-95 transition"
              >
                <Plus size={16} strokeWidth={3} />
                <span>+ Punch New Walk-in Order</span>
              </button>
            )}
          </div>
        )}
      </section>
    </div>

      {/* ======================================================== */ }
  {/* MODAL: PUNCH NEW WALK-IN ORDER (POS COUNTER TERMINAL)     */ }
  {/* ======================================================== */ }
  {
    showNewWalkIn && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="relative w-full max-w-4xl rounded-2xl border border-[#D4A63A]/40 bg-[#12100e] shadow-2xl overflow-hidden my-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#181410] px-6 py-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-[#D4A63A]" />
                <span>Punch Walk-in Customer Order</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Select items from Andhra menu, assign table or counter, and bill immediately.
              </p>
            </div>
            <button
              onClick={() => {
                setShowNewWalkIn(false)
                setWalkInItems({})
              }}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="grid gap-6 p-6 md:grid-cols-12">
            {/* Left Column: Menu Catalog & Categories (7 cols) */}
            <div className="space-y-4 md:col-span-7">
              {/* Order Type & Table Selection */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Service Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWalkInOrderType('DINE_IN')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${walkInOrderType === 'DINE_IN'
                        ? 'border-[#D4A63A] bg-[#D4A63A]/15 text-[#E0B246]'
                        : 'border-white/10 bg-black/40 text-neutral-400 hover:text-white'
                        }`}
                    >
                      <Utensils size={13} /> Dine-in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWalkInOrderType('TAKEAWAY')
                        setWalkInTableId('')
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${walkInOrderType === 'TAKEAWAY'
                        ? 'border-[#D4A63A] bg-[#D4A63A]/15 text-[#E0B246]'
                        : 'border-white/10 bg-black/40 text-neutral-400 hover:text-white'
                        }`}
                    >
                      <ShoppingBag size={13} /> Takeaway
                    </button>
                  </div>
                </div>

                {walkInOrderType === 'DINE_IN' ? (
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      Select Dining Table *
                    </label>
                    <select
                      className={`${field} py-2 text-xs`}
                      value={walkInTableId}
                      onChange={(e) => setWalkInTableId(e.target.value)}
                      required
                    >
                      <option value="">Choose table...</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label} ({t.status}) • Cap: {t.capacity || 4}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      Customer Name / Phone (Optional)
                    </label>
                    <input
                      className={`${field} py-2 text-xs`}
                      placeholder="e.g. Ramesh • 9876543210"
                      value={walkInCustomer}
                      onChange={(e) => setWalkInCustomer(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Menu Category Pills & Search */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <input
                    className={`${field} py-1.5 pl-8 pr-3 text-xs`}
                    placeholder="Search Andhra biryani, starters, specials..."
                    value={walkInSearch}
                    onChange={(e) => setWalkInSearch(e.target.value)}
                  />
                  {walkInSearch && (
                    <button
                      onClick={() => setWalkInSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setWalkInCategory(cat)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${walkInCategory === cat
                        ? 'bg-[#D4A63A] text-black font-bold shadow-sm'
                        : 'border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dish Cards Grid */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {filteredCatalogItems.map((dish) => {
                  const countInTicket = walkInItems[dish.id]?.quantity || 0

                  return (
                    <div
                      key={dish.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-2.5 hover:border-[#D4A63A]/40 transition"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{dish.name}</p>
                        <p className="font-mono text-xs font-bold text-[#E0B246]">
                          ₹{money(dish.price)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {countInTicket > 0 ? (
                          <div className="flex items-center gap-1.5 rounded-lg border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => removeItemFromWalkIn(dish.id)}
                              className="h-5 w-5 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-[#E0B246] px-1">
                              {countInTicket}
                            </span>
                            <button
                              type="button"
                              onClick={() => addItemToWalkIn(dish)}
                              className="h-5 w-5 flex items-center justify-center rounded bg-[#D4A63A] text-black font-bold text-xs hover:bg-[#E8BD57]"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addItemToWalkIn(dish)}
                            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-[#D4A63A] hover:text-black transition"
                          >
                            Add +
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filteredCatalogItems.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-400">
                    No dishes found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Ticket Summary & Actions (5 cols) */}
            <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/60 p-4 md:col-span-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Walk-in Order Ticket
                  </span>
                  <span className="text-[11px] font-semibold text-[#D4A63A]">
                    {Object.values(walkInItems).reduce((acc, it) => acc + it.quantity, 0)} items
                  </span>
                </div>

                {/* Selected items list */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 text-xs pr-1">
                  {Object.values(walkInItems).map((it) => (
                    <div
                      key={it.menuItemId}
                      className="flex items-center justify-between border-b border-white/5 pb-1.5"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white">{it.name}</p>
                        <p className="text-[10px] text-neutral-400">
                          {it.quantity} &times; ₹{money(it.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E0B246]">
                          ₹{money(it.price * it.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => clearWalkInItems(it.menuItemId)}
                          className="text-neutral-500 hover:text-rose-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {Object.keys(walkInItems).length === 0 && (
                    <div className="py-8 text-center text-xs text-neutral-500">
                      Click dishes on the left to add items to this walk-in ticket.
                    </div>
                  )}
                </div>
              </div>

              {/* Calculation & Submit buttons */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-neutral-200">₹{money(walkInSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>GST (5%):</span>
                    <span className="font-mono text-neutral-200">₹{money(walkInTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
                    <span>Grand Total:</span>
                    <span className="font-mono text-[#E0B246]">₹{money(walkInTotal)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loading || Object.keys(walkInItems).length === 0}
                    onClick={() => handleCreateWalkInOrder(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] py-2.5 text-xs font-bold text-black shadow-lg shadow-[#D4A63A]/20 hover:brightness-110 active:scale-95 transition disabled:opacity-40"
                  >
                    <Receipt size={14} />
                    <span>⚡ Place & Bill Walk-in Now (₹{money(walkInTotal)})</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || Object.keys(walkInItems).length === 0}
                    onClick={() => handleCreateWalkInOrder(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
                  >
                    <span>🍳 Send to Kitchen (Bill Later)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
    </Shell >
  )
}
