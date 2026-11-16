import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, managerApi, feedbackApi } from '../../api/staff'
import {
  useBranch, card, button, ghost, money, daysAgo, today, errorText } from './shared'
import { Message, Shell, Kpis, Section, Empty } from './ui'

// Admin: people, roles, approvals, website content and the business summary.
export default function AdminDashboard() {
  const { hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [data, setData] = useState({ staff: [], tables: [], expenses: [], reviews: [], enquiries: [], sales: null })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const [staff, tables, expenses, reviews, enquiries, sales] = await Promise.all([
        floorApi.staff(branchId),
        floorApi.tables(branchId),
        managerApi.expenses(branchId),
        feedbackApi.reviews('PENDING'),
        feedbackApi.enquiries(),
        managerApi.sales(branchId, daysAgo(6), today()),
      ])
      setData({ staff, tables, expenses, reviews, enquiries, sales })
    } catch (err) {
      setError(errorText(err, 'Could not load the dashboard.'))
    }
  }, [branchId])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const act = async (fn, ok) => {
    setError(''); setNotice('')
    try { await fn(); setNotice(ok); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }

  const pendingExpenses = data.expenses.filter((e) => e.status === 'PENDING')
  const byRole = data.staff.reduce((acc, s) => ({ ...acc, [s.role]: (acc[s.role] || 0) + 1 }), {})

  return (
    <Shell eyebrow="Administrator" title="Admin dashboard" links={[
      ['Roles & permissions', '/admin'], ['Branches', '/branches'], ['Menu', '/menu'],
    ]}>
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />
      <Kpis items={[
        ['Staff accounts', data.staff.length],
        ['Tables', data.tables.length],
        ['Net sales (7 days)', `₹${money(data.sales?.net)}`],
        ['Reviews to moderate', data.reviews.length],
      ]} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Staff by role">
          {Object.entries(byRole).map(([role, n]) => <div key={role} className={`${card} flex justify-between`}><span>{role}</span><span className="text-[#D4A63A]">{n}</span></div>)}
          {data.staff.length === 0 ? <Empty>No staff yet. Add them from the Manager dashboard or the Admin page.</Empty> : null}
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
          {pendingExpenses.length === 0 ? <Empty>Nothing waiting for approval.</Empty> : null}
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

        <Section title="Latest website enquiries">
          {data.enquiries.slice(0, 6).map((e) => (
            <div key={e.id} className={card}>
              <p className="font-bold">{e.name} · {e.email}</p>
              <p className="text-sm text-neutral-300">{e.message}</p>
            </div>
          ))}
          {data.enquiries.length === 0 ? <Empty>No enquiries yet.</Empty> : null}
        </Section>

        <Section title="Sales, last 7 days" className="lg:col-span-2">
          {data.sales ? (
            <div className={`${card} grid gap-2 sm:grid-cols-4`}>
              <p>Paid bills: {data.sales.bills}</p>
              <p>Gross: ₹{money(data.sales.gross)}</p>
              <p>Refunds: ₹{money(data.sales.refunds)}</p>
              <p className="font-bold text-[#D4A63A]">Net: ₹{money(data.sales.net)}</p>
            </div>
          ) : <Empty>Loading sales…</Empty>}
        </Section>
      </div>
    </Shell>
  )
}
