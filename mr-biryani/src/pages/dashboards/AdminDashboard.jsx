import { useCallback, useEffect, useMemo, useState } from 'react'
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
  
  // New state for the Add Staff form (Phone added)
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [staffForm, setStaffForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'WAITER' })

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

  // Handle staff creation directly to your backend endpoint
const submitStaff = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    try {
      // This single line replaces the entire fetch() block
      await managerApi.createStaff(branchId, staffForm)
      
      setNotice('Staff member created successfully.')
      setShowStaffForm(false)
      setStaffForm({ fullName: '', email: '', phone: '', password: '', role: 'WAITER' })
      await load() // Refresh dashboard
    } catch (err) {
      setError(errorText(err, 'Could not create staff.'))
    }
  }

  const pendingExpenses = data.expenses.filter((e) => e.status === 'PENDING')
  const byRole = data.staff.reduce((acc, s) => ({ ...acc, [s.role]: (acc[s.role] || 0) + 1 }), {})

  const links = useMemo(() => {
    const list = []
    if (hasPermission('roles.manage')) list.push(['Roles & permissions', '/admin'])
    list.push(['Branches', '/branches'])
    list.push(['Menu', '/menu'])
    return list
  }, [hasPermission])

  const kpiItems = useMemo(() => {
    const items = []
    if (hasPermission('staff.read')) items.push(['Staff accounts', data.staff.length])
    if (hasPermission('tables.read')) items.push(['Tables', data.tables.length])
    if (data.sales) items.push(['Net sales (7 days)', `₹${money(data.sales?.net)}`])
    if (hasPermission('feedback.read') || hasPermission('feedback.moderate')) items.push(['Reviews to moderate', data.reviews.length])
    return items
  }, [hasPermission, data.staff.length, data.tables.length, data.sales, data.reviews.length])

  return (
    <Shell eyebrow="Administrator" title="Admin dashboard" links={links}>
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />
      {kpiItems.length > 0 && <Kpis items={kpiItems} />}

      <div className="grid gap-8 lg:grid-cols-2">
        {(hasPermission('staff.read') || hasPermission('staff.create')) && (
          <Section title="Staff by role">
            {/* ADD STAFF BUTTON */}
            {hasPermission('staff.create') && !showStaffForm && (
              <div className="mb-4">
                <button className={button} onClick={() => setShowStaffForm(true)}>+ Add Staff</button>
              </div>
            )}

            {/* ADD STAFF FORM */}
            {showStaffForm && (
              <form onSubmit={submitStaff} className={`${card} mb-6 space-y-4`}>
                <p className="font-bold">New Staff Member</p>
                <input required placeholder="Full Name" className="w-full p-2 bg-transparent border border-neutral-700 rounded" 
                  value={staffForm.fullName} onChange={e => setStaffForm({...staffForm, fullName: e.target.value})} />
                <input required type="email" placeholder="Email Address" className="w-full p-2 bg-transparent border border-neutral-700 rounded" 
                  value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} />
                
                {/* NEW PHONE FIELD */}
                <input required type="tel" placeholder="Mobile Number" className="w-full p-2 bg-transparent border border-neutral-700 rounded" 
                  value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} />

                <input required minLength="10" placeholder="Password (min 10 characters)" className="w-full p-2 bg-transparent border border-neutral-700 rounded" 
                  value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} />
                  <select className="w-full p-2 bg-transparent border border-neutral-700 rounded [&>option]:bg-neutral-900" 
                    value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="WAITER">Waiter</option>
                  </select>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className={button}>Create Account</button>
                  <button type="button" className={ghost} onClick={() => setShowStaffForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            {Object.entries(byRole).map(([role, n]) => <div key={role} className={`${card} flex justify-between`}><span>{role}</span><span className="text-[#D4A63A]">{n}</span></div>)}
            {data.staff.length === 0 && !showStaffForm ? <Empty>No staff yet. Add them from the Manager dashboard or the Admin page.</Empty> : null}
          </Section>
        )}

        {(hasPermission('expenses.read') || hasPermission('expenses.approve')) && (
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
        )}

        {(hasPermission('feedback.read') || hasPermission('feedback.moderate')) && (
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
        )}

        {hasPermission('feedback.read') && (
          <Section title="Latest website enquiries">
            {data.enquiries.slice(0, 6).map((e) => (
              <div key={e.id} className={card}>
                <p className="font-bold">{e.name} · {e.email}</p>
                <p className="text-sm text-neutral-300">{e.message}</p>
              </div>
            ))}
            {data.enquiries.length === 0 ? <Empty>No enquiries yet.</Empty> : null}
          </Section>
        )}

        {data.sales && (
          <Section title="Sales, last 7 days" className="lg:col-span-2">
            <div className={`${card} grid gap-2 sm:grid-cols-4`}>
              <p>Paid bills: {data.sales.bills}</p>
              <p>Gross: ₹{money(data.sales.gross)}</p>
              <p>Refunds: ₹{money(data.sales.refunds)}</p>
              <p className="font-bold text-[#D4A63A]">Net: ₹{money(data.sales.net)}</p>
            </div>
          </Section>
        )}
      </div>
    </Shell>
  )
}