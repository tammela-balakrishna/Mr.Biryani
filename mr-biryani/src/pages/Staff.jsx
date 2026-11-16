import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import {
  branchApi, floorApi, ordersApi, receptionApi, managerApi, feedbackApi,
} from '../api/staff'

// Staff workspace for the website. Each tab is shown only when the signed-in account has the permission
// the tab needs. The server enforces the same permissions and the branch assignment on every request.

const TABS = [
  { id: 'floor', label: 'Floor', allOf: ['tables.read'] },
  { id: 'orders', label: 'Orders', allOf: ['orders.read'] },
  { id: 'cashier', label: 'Cashier', anyOf: ['billing.read', 'payments.collect'] },
  { id: 'reception', label: 'Reception', allOf: ['reservations.read'] },
  { id: 'manager', label: 'Manager', anyOf: ['inventory.read', 'expenses.read', 'payments.refund.approve'] },
  { id: 'feedback', label: 'Feedback', allOf: ['feedback.read'] },
  { id: 'reports', label: 'Reports', allOf: ['reports.sales.read'] },
]

const today = () => new Date().toISOString().slice(0, 10)
const money = (v) => Number(v ?? 0).toFixed(2)
const errorText = (err, fallback) => (err instanceof ApiError ? err.message : fallback)

const card = 'rounded-xl border border-[#D4A63A]/20 bg-[#111010] p-4'
const button = 'rounded-lg bg-[#D4A63A] px-3 py-2 text-sm font-bold text-black hover:bg-[#E8BD57] disabled:opacity-40'
const ghost = 'rounded-lg border border-white/15 px-3 py-2 text-sm text-neutral-200 hover:border-[#D4A63A] disabled:opacity-40'
const field = 'w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-white outline-none focus:border-[#D4A63A]'

function useBranch() {
  const [branchId, setBranchId] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    branchApi.list()
      .then((list) => setBranchId(list[0]?.id ?? null))
      .catch((err) => setError(errorText(err, 'Could not load the branch.')))
  }, [])
  return { branchId, error }
}

function Message({ text, tone = 'error' }) {
  if (!text) return null
  const colours = tone === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${colours}`}>{text}</p>
}

// ---------- Floor ----------
function FloorTab({ branchId, can }) {
  const [tables, setTables] = useState([])
  const [waiters, setWaiters] = useState([])
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      setTables(await floorApi.tables(branchId))
      if (can('staff.read')) {
        const staff = await floorApi.staff(branchId)
        setWaiters(staff.filter((m) => m.role === 'WAITER'))
      }
    } catch (err) {
      setError(errorText(err, 'Could not load tables.'))
    }
  }, [branchId, can])
  // Loading on mount and on a timer is intentional; the lint rule cannot see that the data arrives after await.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  const act = async (fn) => {
    setError('')
    try {
      await fn()
      await load()
    } catch (err) {
      setError(errorText(err, 'That change could not be saved.'))
    }
  }

  return (
    <div className="space-y-4">
      <Message text={error} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <div key={t.id} className={card}>
            <p className="text-lg font-bold">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
            <p className="text-sm text-[#D4A63A]">{t.status}</p>
            <p className="mt-1 text-xs text-neutral-400">{t.waiter ? `Waiter: ${t.waiter}` : 'No waiter assigned'}</p>
            {can('tables.allocate') || can('tables.release') ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].filter((s) => s !== t.status).map((s) => (
                  <button key={s} className={ghost} onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, s))}>{s}</button>
                ))}
              </div>
            ) : null}
            {can('tables.assign') && waiters.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {waiters.map((w) => (
                  <button key={w.userId} className={ghost} onClick={() => act(() => floorApi.assignWaiter(branchId, t.id, w.userId))}>
                    Assign {w.fullName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {tables.length === 0 ? <p className="text-neutral-400">No tables set up yet.</p> : null}
    </div>
  )
}

// ---------- Orders (waiter and captain) ----------
const NEXT = {
  PLACED: { to: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
  SERVED: { to: 'COMPLETED', label: 'Complete' },
}

function OrdersTab({ branchId, can }) {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const load = useCallback(() => ordersApi.list(branchId).then(setOrders).catch((err) => setError(errorText(err, 'Could not load orders.'))), [branchId])
  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])
  return (
    <div className="space-y-3">
      <Message text={error} />
      {orders.map((o) => {
        const step = NEXT[o.status]
        return (
          <div key={o.id} className={card}>
            <div className="flex justify-between">
              <p className="font-bold">#{o.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-[#D4A63A]">{o.status}</p>
            </div>
            <ul className="mt-2 text-sm text-neutral-200">
              {o.items.map((i) => <li key={i.name + i.quantity}>{i.quantity} × {i.name}</li>)}
            </ul>
            {step && can('orders.update') ? (
              <button className={`${button} mt-3`} onClick={async () => {
                setError('')
                try { await ordersApi.setStatus(o.id, step.to); await load() } catch (err) { setError(errorText(err, 'Could not update the order.')) }
              }}>{step.label}</button>
            ) : null}
          </div>
        )
      })}
      {orders.length === 0 ? <p className="text-neutral-400">No open orders.</p> : null}
    </div>
  )
}

// ---------- Cashier ----------
function CashierTab({ branchId, can }) {
  const [served, setServed] = useState([])
  const [bill, setBill] = useState(null)
  const [method, setMethod] = useState('CASH')
  const [amount, setAmount] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Served orders that already have a bill are hidden, so an order cannot be billed twice.
  const loadServed = useCallback(async () => {
    try {
      const orders = await ordersApi.list(branchId, 'SERVED')
      const bills = can('billing.read') ? await ordersApi.bills(branchId) : []
      const billed = new Set(bills.map((b) => b.order_id))
      setServed(orders.filter((o) => !billed.has(o.id)))
    } catch (err) {
      setError(errorText(err, 'Could not load orders.'))
    }
  }, [branchId, can])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServed()
  }, [loadServed])

  const openBill = async (orderId) => {
    setError(''); setNotice(''); setReceipt(null)
    try {
      const created = await ordersApi.createBill(branchId, orderId)
      setBill(created)
      setAmount(String(created.due))
      loadServed()
    } catch (err) { setError(errorText(err, 'Could not create the bill.')) }
  }

  const pay = async () => {
    setError(''); setNotice('')
    try {
      await ordersApi.pay(branchId, bill.id, method, Number(amount))
      const updated = await ordersApi.bill(branchId, bill.id)
      setBill(updated)
      setAmount(String(updated.due))
      setNotice('Payment recorded.')
    } catch (err) { setError(errorText(err, 'Payment could not be recorded.')) }
  }

  const [history, setHistory] = useState([])
  const [historyFilter, setHistoryFilter] = useState('')
  const loadHistory = useCallback(() => {
    if (!can('billing.read')) return
    ordersApi.bills(branchId, historyFilter || undefined).then(setHistory).catch((err) => setError(errorText(err, 'Could not load bill history.')))
  }, [branchId, historyFilter, can])
  useEffect(() => { loadHistory() }, [loadHistory, bill])

  const openFromHistory = async (billId) => {
    setError(''); setNotice(''); setReceipt(null)
    try { setBill(await ordersApi.bill(branchId, billId)) } catch (err) { setError(errorText(err, 'Could not open the bill.')) }
  }

  const showReceipt = async () => {
    setError('')
    try { setReceipt(await ordersApi.receipt(branchId, bill.id)) } catch (err) { setError(errorText(err, 'Could not load the receipt.')) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-bold">Served orders</h3>
        {served.map((o) => (
          <div key={o.id} className={`${card} flex items-center justify-between`}>
            <span>#{o.id.slice(0, 8).toUpperCase()} · ₹{money(o.total)}</span>
            {can('billing.generate') ? <button className={ghost} onClick={() => openBill(o.id)}>Create bill</button> : null}
          </div>
        ))}
        {served.length === 0 ? <p className="text-neutral-400">Nothing waiting for payment.</p> : null}
        {can('billing.read') ? (
          <>
          <h3 className="pt-4 font-bold">Bill history</h3>
          <div className="flex gap-2">
            {['', 'OPEN', 'PAID'].map((f) => (
              <button key={f || 'all'} className={historyFilter === f ? button : ghost} onClick={() => setHistoryFilter(f)}>{f || 'All'}</button>
            ))}
          </div>
          {history.map((h) => (
            <div key={h.id} className={`${card} flex items-center justify-between gap-3`}>
              <span>#{h.order_id.slice(0, 8).toUpperCase()} · ₹{money(h.total)} · paid ₹{money(h.paid)} · <span className={h.status === 'PAID' ? 'text-green-300' : 'text-[#D4A63A]'}>{h.status}</span></span>
              <button className={ghost} onClick={() => openFromHistory(h.id)}>Open</button>
            </div>
          ))}
          {history.length === 0 ? <p className="text-neutral-400">No bills yet.</p> : null}
          </>
        ) : null}
      </div>
      <div className="space-y-3">
        <h3 className="font-bold">Bill</h3>
        {!bill ? <p className="text-neutral-400">Choose a served order to create a bill.</p> : (
          <div className={`${card} space-y-3`}>
            <p>Total ₹{money(bill.total)} · Paid ₹{money(bill.paid)} · <span className="text-[#D4A63A]">Due ₹{money(bill.due)}</span></p>
            <p className="text-sm text-neutral-400">Status: {bill.status}</p>
            {bill.status !== 'PAID' && can('payments.collect') ? (
              <>
                <div className="flex gap-2">
                  {['CASH', 'CARD', 'UPI'].map((m) => (
                    <button key={m} className={method === m ? button : ghost} onClick={() => setMethod(m)}>{m}</button>
                  ))}
                </div>
                <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Amount" />
                <button className={button} onClick={pay}>Record {method} payment</button>
              </>
            ) : null}
            <button className={ghost} onClick={showReceipt}>View receipt</button>
            {receipt ? (
              <div className="rounded-lg bg-[#080808] p-3 text-sm">
                <p className="font-bold">Receipt</p>
                <p>Subtotal ₹{money(receipt.subtotal)} · Tax ₹{money(receipt.taxTotal)} · Total ₹{money(receipt.total)}</p>
                {receipt.payments.map((p) => <p key={p.id}>{p.method}: ₹{money(p.amount)}</p>)}
                {receipt.refunds.map((r) => <p key={r.id} className="text-neutral-400">Refund ₹{money(r.amount)} ({r.reason})</p>)}
              </div>
            ) : null}
          </div>
        )}
        <Message text={error} />
        <Message text={notice} tone="ok" />
      </div>
    </div>
  )
}

// ---------- Reception ----------
const STATUS_LABEL = { REQUESTED: 'Requested', CONFIRMED: 'Confirmed', CHECKED_IN: 'Checked in', CANCELLED: 'Cancelled' }

function ReceptionTab({ branchId, can }) {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [walk, setWalk] = useState({ guestName: '', partySize: '2' })
  const [error, setError] = useState('')
  const load = useCallback(() => receptionApi.day(branchId, date).then(setRows).catch((err) => setError(errorText(err, 'Could not load reservations.'))), [branchId, date])
  useEffect(() => {
    load()
  }, [load])

  const act = async (fn) => {
    setError('')
    try { await fn(); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>
      <Message text={error} />
      {can('reservations.check_in') ? (
        <div className={`${card} grid gap-3 sm:grid-cols-3`}>
          <input className={field} placeholder="Guest name" value={walk.guestName} onChange={(e) => setWalk({ ...walk, guestName: e.target.value })} />
          <input className={field} inputMode="numeric" value={walk.partySize} onChange={(e) => setWalk({ ...walk, partySize: e.target.value.replace(/\D/g, '') })} />
          <button className={button} disabled={!walk.guestName.trim()} onClick={() => act(async () => {
            await receptionApi.walkIn(branchId, { guestName: walk.guestName.trim(), partySize: Number(walk.partySize) })
            setWalk({ guestName: '', partySize: '2' })
          })}>Seat walk-in</button>
        </div>
      ) : null}
      {rows.map((r) => (
        <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div>
            <p className="font-bold">{new Date(r.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.partySize} guests</p>
            <p className="text-sm text-neutral-400">{STATUS_LABEL[r.status] ?? r.status}{r.notes ? ` · ${r.notes}` : ''}</p>
          </div>
          <div className="flex gap-2">
            {r.status === 'REQUESTED' && can('reservations.confirm') ? <button className={button} onClick={() => act(() => receptionApi.confirm(branchId, r.id))}>Confirm</button> : null}
            {r.status === 'CONFIRMED' && can('reservations.check_in') ? <button className={button} onClick={() => act(() => receptionApi.checkIn(branchId, r.id))}>Check in</button> : null}
          </div>
        </div>
      ))}
      {rows.length === 0 ? <p className="text-neutral-400">No reservations for this day.</p> : null}
    </div>
  )
}

// ---------- Manager ----------
function ManagerTab({ branchId, can }) {
  const [inventory, setInventory] = useState([])
  const [expenses, setExpenses] = useState([])
  const [refunds, setRefunds] = useState([])
  const [staff, setStaff] = useState([])
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' })
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'WAITER' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      if (can('inventory.read')) setInventory(await managerApi.inventory(branchId))
      if (can('expenses.read')) setExpenses(await managerApi.expenses(branchId))
      if (can('payments.refund.approve')) setRefunds(await managerApi.refundsRequested(branchId))
      if (can('staff.read')) setStaff(await floorApi.staff(branchId))
    } catch (err) { setError(errorText(err, 'Could not load manager data.')) }
  }, [branchId, can])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const act = async (fn, ok) => {
    setError(''); setNotice('')
    try { await fn(); setNotice(ok); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <Message text={error} />
        <Message text={notice} tone="ok" />
        {can('inventory.read') ? (
          <section className="space-y-2">
            <h3 className="font-bold">Stock</h3>
            {inventory.map((i) => (
              <div key={i.id} className={`${card} flex items-center justify-between`}>
                <span className={i.lowStock ? 'text-red-300' : ''}>{i.name}: {Number(i.quantity)} {i.unit}{i.lowStock ? ' · low' : ''}</span>
                {can('inventory.adjust') ? (
                  <span className="flex gap-2">
                    <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, 1, 'Manual adjustment'), 'Stock updated.')}>+1</button>
                    <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, -1, 'Manual adjustment'), 'Stock updated.')}>−1</button>
                  </span>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
        {can('expenses.create') ? (
          <section className={`${card} space-y-2`}>
            <h3 className="font-bold">Record an expense</h3>
            <input className={field} placeholder="Category" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} />
            <input className={field} placeholder="Amount" inputMode="decimal" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <input className={field} placeholder="Description" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
            <button className={button} onClick={() => act(async () => {
              await managerApi.recordExpense(branchId, { category: expense.category.trim(), amount: Number(expense.amount), description: expense.description.trim() })
              setExpense({ category: '', amount: '', description: '' })
            }, 'Expense saved.')}>Save expense</button>
          </section>
        ) : null}
      </div>
      <div className="space-y-5">
        {can('payments.refund.approve') ? (
          <section className="space-y-2">
            <h3 className="font-bold">Refunds awaiting approval</h3>
            {refunds.map((r) => (
              <div key={r.id} className={`${card} space-y-2`}>
                <p>₹{money(r.amount)} · {r.reason}</p>
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, true), 'Refund approved.')}>Approve</button>
                  <button className={ghost} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, false), 'Refund rejected.')}>Reject</button>
                </div>
              </div>
            ))}
            {refunds.length === 0 ? <p className="text-neutral-400">None waiting.</p> : null}
          </section>
        ) : null}
        {can('expenses.approve') ? (
          <section className="space-y-2">
            <h3 className="font-bold">Expenses awaiting approval</h3>
            {expenses.filter((e) => e.status === 'PENDING').map((e) => (
              <div key={e.id} className={`${card} space-y-2`}>
                <p>{e.category} · ₹{money(e.amount)}</p>
                <p className="text-sm text-neutral-400">{e.description}</p>
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, true), 'Expense approved.')}>Approve</button>
                  <button className={ghost} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, false), 'Expense rejected.')}>Reject</button>
                </div>
              </div>
            ))}
          </section>
        ) : null}
        {can('users.manage') || can('staff.create') ? (
          <section className={`${card} space-y-2`}>
            <h3 className="font-bold">Add staff</h3>
            <input className={field} placeholder="Full name" value={newStaff.fullName} onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })} />
            <input className={field} placeholder="Email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
            <input className={field} type="password" placeholder="Password (10+ characters)" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
            <select className={field} value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
              {['WAITER', 'RECEPTIONIST', 'CAPTAIN', 'CASHIER', 'MANAGER'].map((r) => <option key={r}>{r}</option>)}
            </select>
            <button className={button} onClick={() => act(async () => {
              await managerApi.createStaff(branchId, newStaff)
              setNewStaff({ fullName: '', email: '', password: '', role: 'WAITER' })
            }, 'Staff account created.')}>Create account</button>
          </section>
        ) : null}
        {can('staff.read') ? (
          <section className="space-y-2">
            <h3 className="font-bold">Staff in this branch</h3>
            {staff.map((s) => (
              <div key={s.userId} className={`${card} flex items-center justify-between`}>
                <span>{s.fullName} · {s.role}</span>
                {can('staff.disable') ? <button className={ghost} onClick={() => act(() => managerApi.disableStaff(branchId, s.userId), 'Access removed for this branch.')}>Remove</button> : null}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  )
}

// ---------- Feedback (reviews and enquiries) ----------
function FeedbackTab({ can }) {
  const [reviews, setReviews] = useState([])
  const [enquiries, setEnquiries] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    try {
      setReviews(await feedbackApi.reviews('PENDING'))
      setEnquiries(await feedbackApi.enquiries())
    } catch (err) {
      setError(errorText(err, 'Could not load feedback.'))
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const decide = async (id, approve) => {
    setError(''); setNotice('')
    try {
      await feedbackApi.decideReview(id, approve)
      setNotice(approve ? 'Review published.' : 'Review rejected.')
      await load()
    } catch (err) {
      setError(errorText(err, 'That review could not be decided.'))
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-bold">Reviews waiting for approval</h3>
        <Message text={error} />
        <Message text={notice} tone="ok" />
        {reviews.map((r) => (
          <div key={r.id} className={`${card} space-y-2`}>
            <p className="font-bold">{r.name} · {r.rating}★ · {r.category}</p>
            <p className="text-sm text-neutral-300">{r.comment}</p>
            {can('feedback.moderate') ? (
              <div className="flex gap-2">
                <button className={button} onClick={() => decide(r.id, true)}>Publish</button>
                <button className={ghost} onClick={() => decide(r.id, false)}>Reject</button>
              </div>
            ) : null}
          </div>
        ))}
        {reviews.length === 0 ? <p className="text-neutral-400">No reviews waiting.</p> : null}
      </div>
      <div className="space-y-3">
        <h3 className="font-bold">Website enquiries</h3>
        {enquiries.map((e) => (
          <div key={e.id} className={card}>
            <p className="font-bold">{e.name} · {e.email}</p>
            <p className="text-sm text-neutral-300">{e.message}</p>
            <p className="text-xs text-neutral-500">{new Date(e.created_at).toLocaleString()}</p>
          </div>
        ))}
        {enquiries.length === 0 ? <p className="text-neutral-400">No enquiries yet.</p> : null}
      </div>
    </div>
  )
}

// ---------- Reports ----------
function ReportsTab({ branchId }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const range = useMemo(() => {
    const to = new Date()
    const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000)
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
  }, [])
  useEffect(() => {
    managerApi.sales(branchId, range.from, range.to).then(setReport).catch((err) => setError(errorText(err, 'Could not load the report.')))
  }, [branchId, range])
  if (error) return <Message text={error} />
  if (!report) return <p className="text-neutral-400">Loading…</p>
  return (
    <div className={`${card} max-w-xl space-y-2`}>
      <p className="text-lg font-bold text-[#D4A63A]">Sales, {report.from} to {report.to}</p>
      <p>Paid bills: {report.bills}</p>
      <p>Gross: ₹{money(report.gross)}</p>
      <p>Approved refunds: ₹{money(report.refunds)}</p>
      <p className="font-bold">Net: ₹{money(report.net)}</p>
      {Object.entries(report.byMethod).map(([m, a]) => <p key={m} className="text-neutral-300">{m}: ₹{money(a)}</p>)}
    </div>
  )
}

export default function Staff() {
  const { hasPermission, hasAnyPermission } = useAuth()
  const { branchId, error } = useBranch()
  const visible = TABS.filter((t) => {
    const allOk = !t.allOf || t.allOf.every((p) => hasPermission(p))
    const anyOk = !t.anyOf || hasAnyPermission(t.anyOf)
    return allOk && anyOk
  })
  const [active, setActive] = useState(null)
  const current = visible.find((t) => t.id === active)?.id ?? visible[0]?.id
  const can = useCallback((p) => hasPermission(p), [hasPermission])

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl font-bold">Staff <span className="text-[#D4A63A]">workspace</span></h1>
          {hasPermission('roles.manage') ? <Link to="/admin" className="text-sm font-bold text-[#D4A63A]">Admin →</Link> : null}
        </div>
        <Message text={error} />
        {visible.length === 0 ? (
          <p className="text-neutral-400">Your account has no workspace tabs yet. Ask an administrator for access.</p>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2" aria-label="Staff sections">
              {visible.map((t) => (
                <button key={t.id} onClick={() => setActive(t.id)} aria-current={current === t.id ? 'page' : undefined}
                  className={current === t.id ? button : ghost}>{t.label}</button>
              ))}
            </nav>
            {!branchId ? <p className="text-neutral-400">Loading branch…</p> : (
              <section>
                {current === 'floor' && <FloorTab branchId={branchId} can={can} />}
                {current === 'orders' && <OrdersTab branchId={branchId} can={can} />}
                {current === 'cashier' && <CashierTab branchId={branchId} can={can} />}
                {current === 'reception' && <ReceptionTab branchId={branchId} can={can} />}
                {current === 'manager' && <ManagerTab branchId={branchId} can={can} />}
                {current === 'feedback' && <FeedbackTab can={can} />}
                {current === 'reports' && <ReportsTab branchId={branchId} />}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
