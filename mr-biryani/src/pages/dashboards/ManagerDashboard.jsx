import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, managerApi, feedbackApi } from '../../api/staff'
import { useBranch, card, button, ghost, field, money, daysAgo, today, errorText } from './shared'
import { Message, Shell, Empty } from './ui'

// Manager: the branch's day. "Needs attention" shows what is waiting; each tab holds one area.
const TABS = [
  ['overview', 'Overview'],
  ['stock', 'Stock'],
  ['spending', 'Spending & refunds'],
  ['team', 'Team'],
  ['feedback', 'Feedback'],
]

const STATUS_STYLE = {
  PENDING: 'text-[#D4A63A]',
  APPROVED: 'text-green-300',
  REJECTED: 'text-red-300',
}

const dayLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })

export default function ManagerDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ inventory: [], expenses: [], refunds: [], staff: [], reviews: [], sales: null, daily: [] })
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' })
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'WAITER' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
      const [inventory, expenses, refunds, staff, reviews, sales, daily] = await Promise.all([
        managerApi.inventory(branchId),
        managerApi.expenses(branchId),
        hasPermission('payments.refund.approve') ? managerApi.refundsRequested(branchId) : Promise.resolve([]),
        hasPermission('staff.read') ? floorApi.staff(branchId) : Promise.resolve([]),
        feedbackApi.reviews('PENDING'),
        managerApi.sales(branchId, daysAgo(6), today()),
        Promise.all(days.map((d) => managerApi.sales(branchId, d, d).then((s) => ({ day: d, net: Number(s.net) })).catch(() => ({ day: d, net: 0 })))),
      ])
      setData({ inventory, expenses, refunds, staff, reviews, sales, daily })
    } catch (err) {
      setError(errorText(err, 'Could not load the dashboard.'))
    }
  }, [branchId, hasPermission])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const act = async (fn, ok) => {
    setError(''); setNotice('')
    try { await fn(); setNotice(ok); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  const lowStock = data.inventory.filter((i) => i.lowStock)
  const pendingExpenses = data.expenses.filter((e) => e.status === 'PENDING')
  const maxDay = Math.max(1, ...data.daily.map((d) => d.net))

  const attention = [
    ['spending', 'Expenses to approve', pendingExpenses.length],
    ['spending', 'Refunds to approve', data.refunds.length],
    ['stock', 'Low-stock items', lowStock.length],
    ['feedback', 'Reviews to publish', data.reviews.length],
  ]

  return (
    <Shell eyebrow="Branch manager" title="Manager dashboard" links={hasPermission('roles.manage') ? [['Admin', '/admin']] : []}>
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold">Needs your attention</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {attention.map(([target, label, count]) => (
            <button key={label} onClick={() => setTab(target)}
              className={`${card} text-left hover:border-[#D4A63A] ${count > 0 ? 'border-[#D4A63A]/60' : ''}`}>
              <p className="text-xs uppercase tracking-wider text-neutral-400">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${count > 0 ? 'text-[#D4A63A]' : 'text-neutral-500'}`}>{count}</p>
            </button>
          ))}
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" aria-label="Manager sections">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
            className={tab === id ? button : ghost}>{label}</button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <section className={`${card} space-y-4 lg:col-span-2`}>
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold">Net sales, last 7 days</h3>
              <p className="text-[#D4A63A]">₹{money(data.sales?.net)}</p>
            </div>
            <div className="flex h-48 items-end gap-3" role="img" aria-label="Daily net sales for the last 7 days">
              {data.daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs text-neutral-400">₹{money(d.net)}</span>
                  <div className="w-full rounded-t bg-[#D4A63A]" style={{ height: `${Math.max(3, (d.net / maxDay) * 140)}px` }} />
                  <span className="text-xs text-neutral-300">{dayLabel(d.day)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <p>Paid bills: <span className="font-bold">{data.sales?.bills ?? 0}</span></p>
              <p>Gross: <span className="font-bold">₹{money(data.sales?.gross)}</span></p>
              <p>Refunds: <span className="font-bold">₹{money(data.sales?.refunds)}</span></p>
              <p>Net: <span className="font-bold text-[#D4A63A]">₹{money(data.sales?.net)}</span></p>
            </div>
          </section>

          <section className={`${card} space-y-3`}>
            <h3 className="font-bold">Low stock</h3>
            {lowStock.map((i) => <p key={i.id} className="text-red-300">{i.name}: {Number(i.quantity)} {i.unit}</p>)}
            {lowStock.length === 0 ? <Empty>All stock is above its reorder level.</Empty> : null}
          </section>
        </div>
      ) : null}

      {tab === 'stock' ? (
        <section className="space-y-3">
          {data.inventory.map((i) => (
            <div key={i.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className={`font-bold ${i.lowStock ? 'text-red-300' : ''}`}>{i.name}</p>
                <p className="text-sm text-neutral-400">{Number(i.quantity)} {i.unit} · reorder at {Number(i.reorderLevel)}{i.lowStock ? ' · low' : ''}</p>
              </div>
              {hasPermission('inventory.adjust') ? (
                <div className="flex gap-2">
                  <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, 1, 'Manual adjustment'), 'Stock updated.')}>+1</button>
                  <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, -1, 'Manual adjustment'), 'Stock updated.')}>−1</button>
                </div>
              ) : null}
            </div>
          ))}
          {data.inventory.length === 0 ? <Empty>No stock items yet.</Empty> : null}
        </section>
      ) : null}

      {tab === 'spending' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="font-bold">Expenses to approve</h3>
            {pendingExpenses.map((e) => (
              <div key={e.id} className={`${card} space-y-2`}>
                <p>{e.category} · ₹{money(e.amount)}</p>
                <p className="text-sm text-neutral-400">{e.description}</p>
                {hasPermission('expenses.approve') ? (
                  <div className="flex gap-2">
                    <button className={button} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, true), 'Expense approved.')}>Approve</button>
                    <button className={ghost} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, false), 'Expense rejected.')}>Reject</button>
                  </div>
                ) : <p className="text-xs text-neutral-500">Waiting for an administrator to approve.</p>}
              </div>
            ))}
            {pendingExpenses.length === 0 ? <Empty>Nothing waiting for approval.</Empty> : null}

            <h3 className="pt-4 font-bold">Recent expenses</h3>
            {data.expenses.slice(0, 8).map((e) => (
              <div key={e.id} className={`${card} flex justify-between text-sm`}>
                <span>{e.category} · ₹{money(e.amount)}</span>
                <span className={STATUS_STYLE[e.status] ?? ''}>{e.status}</span>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="font-bold">Refunds to approve</h3>
            {data.refunds.map((r) => (
              <div key={r.id} className={`${card} space-y-2`}>
                <p>₹{money(r.amount)} · {r.reason}</p>
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, true), 'Refund approved.')}>Approve</button>
                  <button className={ghost} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, false), 'Refund rejected.')}>Reject</button>
                </div>
              </div>
            ))}
            {data.refunds.length === 0 ? <Empty>No refunds waiting.</Empty> : null}

            {hasPermission('expenses.create') ? (
              <div className={`${card} mt-4 space-y-2`}>
                <p className="font-bold">Record an expense</p>
                <input className={field} placeholder="Category (e.g. Utilities)" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} />
                <input className={field} placeholder="Amount" inputMode="decimal" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value.replace(/[^\d.]/g, '') })} />
                <input className={field} placeholder="Description" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
                <button className={button} onClick={() => act(async () => {
                  await managerApi.recordExpense(branchId, { category: expense.category.trim(), amount: Number(expense.amount), description: expense.description.trim() })
                  setExpense({ category: '', amount: '', description: '' })
                }, 'Expense saved for approval.')}>Save expense</button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === 'team' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="font-bold">Staff in this branch</h3>
            {data.staff.map((s) => (
              <div key={s.userId} className={`${card} flex items-center justify-between`}>
                <span>{s.fullName} <span className="text-sm text-neutral-400">· {s.role}</span></span>
                {hasPermission('staff.disable') ? <button className={ghost} onClick={() => act(() => managerApi.disableStaff(branchId, s.userId), 'Access removed for this branch.')}>Remove</button> : null}
              </div>
            ))}
            {data.staff.length === 0 ? <Empty>No staff listed.</Empty> : null}
          </section>
          {hasPermission('staff.create') ? (
            <section className={`${card} space-y-2 self-start`}>
              <p className="font-bold">Add a staff member</p>
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
        </div>
      ) : null}

      {tab === 'feedback' ? (
        <section className="space-y-3">
          {data.reviews.map((r) => (
            <div key={r.id} className={`${card} space-y-2`}>
              <p className="font-bold">{r.name} · {r.rating}★ · {r.category}</p>
              <p className="text-sm text-neutral-300">{r.comment}</p>
              {hasPermission('feedback.moderate') ? (
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(() => feedbackApi.decideReview(r.id, true), 'Review published.')}>Publish</button>
                  <button className={ghost} onClick={() => act(() => feedbackApi.decideReview(r.id, false), 'Review rejected.')}>Reject</button>
                </div>
              ) : null}
            </div>
          ))}
          {data.reviews.length === 0 ? <Empty>No reviews waiting.</Empty> : null}
        </section>
      ) : null}
    </Shell>
  )
}
