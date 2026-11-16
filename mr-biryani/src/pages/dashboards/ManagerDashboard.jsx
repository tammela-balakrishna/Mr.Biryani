import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, managerApi, feedbackApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, field, money, daysAgo, today, errorText } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

// Manager: runs the branch day to day: stock, spending, refunds, staff and reviews.
export default function ManagerDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [data, setData] = useState({ inventory: [], expenses: [], refunds: [], staff: [], reviews: [], sales: null })
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' })
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'WAITER' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [inventory, expenses, refunds, staff, reviews, sales] = await Promise.all([
        managerApi.inventory(branchId),
        managerApi.expenses(branchId),
        hasPermission('payments.refund.approve') ? managerApi.refundsRequested(branchId) : Promise.resolve([]),
        floorApi.staff(branchId),
        feedbackApi.reviews('PENDING'),
        managerApi.sales(branchId, daysAgo(6), today()),
      ])
      setData({ inventory, expenses, refunds, staff, reviews, sales })
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

  return (
    <Shell eyebrow="Branch manager" title="Manager dashboard" links={[['Admin', '/admin']].filter(() => hasPermission('roles.manage'))}>
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />
      <Kpis items={[
        ['Net sales (7 days)', `₹${money(data.sales?.net)}`],
        ['Low stock items', lowStock.length],
        ['Expenses to approve', pendingExpenses.length],
        ['Refunds to approve', data.refunds.length],
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Stock">
          {data.inventory.map((i) => (
            <div key={i.id} className={`${card} flex items-center justify-between gap-3`}>
              <span className={i.lowStock ? 'text-red-300' : ''}>{i.name}: {Number(i.quantity)} {i.unit}{i.lowStock ? ' · low' : ''}</span>
              {hasPermission('inventory.adjust') ? (
                <span className="flex gap-2">
                  <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, 1, 'Manual adjustment'), 'Stock updated.')}>+1</button>
                  <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, -1, 'Manual adjustment'), 'Stock updated.')}>−1</button>
                </span>
              ) : null}
            </div>
          ))}
          {data.inventory.length === 0 ? <Empty>No stock items yet.</Empty> : null}
        </Section>

        <Section title="Record an expense">
          <div className={`${card} space-y-2`}>
            <input className={field} placeholder="Category" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} />
            <input className={field} placeholder="Amount" inputMode="decimal" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value.replace(/[^\d.]/g, '') })} />
            <input className={field} placeholder="Description" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
            <button className={button} onClick={() => act(async () => {
              await managerApi.recordExpense(branchId, { category: expense.category.trim(), amount: Number(expense.amount), description: expense.description.trim() })
              setExpense({ category: '', amount: '', description: '' })
            }, 'Expense saved for approval.')}>Save expense</button>
          </div>
        </Section>

        <Section title="Expenses to approve">
          {pendingExpenses.map((e) => (
            <div key={e.id} className={`${card} space-y-2`}>
              <p>{e.category} · ₹{money(e.amount)}</p>
              <p className="text-sm text-neutral-400">{e.description}</p>
              {hasPermission('expenses.approve') ? (
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, true), 'Expense approved.')}>Approve</button>
                  <button className={ghost} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, false), 'Expense rejected.')}>Reject</button>
                </div>
              ) : null}
            </div>
          ))}
          {pendingExpenses.length === 0 ? <Empty>Nothing waiting.</Empty> : null}
        </Section>

        <Section title="Refunds to approve">
          {data.refunds.map((r) => (
            <div key={r.id} className={`${card} space-y-2`}>
              <p>₹{money(r.amount)} · {r.reason}</p>
              <div className="flex gap-2">
                <button className={button} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, true), 'Refund approved.')}>Approve</button>
                <button className={ghost} onClick={() => act(() => managerApi.decideRefund(branchId, r.id, false), 'Refund rejected.')}>Reject</button>
              </div>
            </div>
          ))}
          {data.refunds.length === 0 ? <Empty>None waiting.</Empty> : null}
        </Section>

        <Section title="Staff in this branch">
          {data.staff.map((s) => (
            <div key={s.userId} className={`${card} flex items-center justify-between`}>
              <span>{s.fullName} · {s.role}</span>
              {hasPermission('staff.disable') ? <button className={ghost} onClick={() => act(() => managerApi.disableStaff(branchId, s.userId), 'Access removed for this branch.')}>Remove</button> : null}
            </div>
          ))}
          {hasPermission('staff.create') ? (
            <div className={`${card} space-y-2`}>
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
            </div>
          ) : null}
        </Section>

        <Section title="Reviews waiting for publishing">
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
        </Section>
      </div>
    </Shell>
  )
}
