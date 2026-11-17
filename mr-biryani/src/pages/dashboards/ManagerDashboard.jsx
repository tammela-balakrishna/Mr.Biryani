import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, managerApi, feedbackApi, menuApi } from '../../api/staff'
import { useBranch, card, button, ghost, field, money, daysAgo, today, errorText, TABLE_STATUSES } from './shared'
import { Message, Shell, Empty } from './ui'

// Manager: the branch's day. "Needs attention" shows what is waiting; each tab holds one area and
// offers add, edit and remove where the manager's permissions allow it.
const TABS = [
  ['overview', 'Overview'],
  ['stock', 'Stock'],
  ['tables', 'Tables'],
  ['menu', 'Menu'],
  ['spending', 'Spending & refunds'],
  ['team', 'Team'],
  ['feedback', 'Feedback'],
]

const ROLES = ['WAITER', 'RECEPTIONIST', 'CAPTAIN', 'CASHIER', 'MANAGER']
const STATUS_STYLE = { PENDING: 'text-[#D4A63A]', APPROVED: 'text-green-300', REJECTED: 'text-red-300' }
const dayLabel = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })
const num = (v) => String(v).replace(/[^\d.]/g, '')

export default function ManagerDashboard() {
  const { user, hasPermission } = useAuth()
  const { branchId, error: branchError } = useBranch()
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState({ inventory: [], expenses: [], refunds: [], staff: [], reviews: [], tables: [], menu: [], sales: null, daily: [] })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Forms and inline editing state.
  const [newItem, setNewItem] = useState({ name: '', unit: '', reorderLevel: '' })
  const [editItem, setEditItem] = useState(null)
  const [newTable, setNewTable] = useState({ label: '', capacity: '4' })
  const [editTable, setEditTable] = useState(null)
  const [editMenu, setEditMenu] = useState(null)
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' })
  const [editExpense, setEditExpense] = useState(null)
  const [roleDraft, setRoleDraft] = useState({})
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', password: '', role: 'WAITER' })

  const load = useCallback(async () => {
    if (!branchId) return
    try {
      const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i))
      const [inventory, expenses, refunds, staff, reviews, sales, daily, tables, menu] = await Promise.all([
        managerApi.inventory(branchId),
        managerApi.expenses(branchId),
        hasPermission('payments.refund.approve') ? managerApi.refundsRequested(branchId) : Promise.resolve([]),
        hasPermission('staff.read') ? floorApi.staff(branchId) : Promise.resolve([]),
        feedbackApi.reviews('PENDING'),
        managerApi.sales(branchId, daysAgo(6), today()),
        Promise.all(days.map((d) => managerApi.sales(branchId, d, d).then((s) => ({ day: d, net: Number(s.net) })).catch(() => ({ day: d, net: 0 })))),
        hasPermission('tables.read') ? floorApi.tables(branchId) : Promise.resolve([]),
        hasPermission('menu.read') ? menuApi.list() : Promise.resolve({ categories: [] }),
      ])
      setData({ inventory, expenses, refunds, staff, reviews, sales, daily, tables, menu: menu.categories ?? [] })
    } catch (err) {
      setError(errorText(err, 'Could not load the dashboard.'))
    }
  }, [branchId, hasPermission])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Runs one change, shows the result, and reloads the data.
  const act = async (fn, ok) => {
    setError(''); setNotice('')
    try { await fn(); setNotice(ok); await load() } catch (err) { setError(errorText(err, 'That change could not be saved.')) }
  }
  const confirmThen = (question, fn) => { if (window.confirm(question)) fn() }

  const lowStock = data.inventory.filter((i) => i.lowStock)
  const pendingExpenses = data.expenses.filter((e) => e.status === 'PENDING')
  const maxDay = Math.max(1, ...data.daily.map((d) => d.net))
  const menuItems = data.menu.flatMap((c) => (c.items || []).map((i) => ({ ...i, category: c.name })))

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
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            {data.inventory.map((i) => editItem?.id === i.id ? (
              <div key={i.id} className={`${card} grid gap-2 sm:grid-cols-4`}>
                <input className={field} aria-label="Name" value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
                <input className={field} aria-label="Unit" value={editItem.unit} onChange={(e) => setEditItem({ ...editItem, unit: e.target.value })} />
                <input className={field} aria-label="Reorder level" inputMode="decimal" value={editItem.reorderLevel} onChange={(e) => setEditItem({ ...editItem, reorderLevel: num(e.target.value) })} />
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(async () => { await managerApi.updateItem(branchId, i.id, { name: editItem.name.trim(), unit: editItem.unit.trim(), reorderLevel: Number(editItem.reorderLevel) }); setEditItem(null) }, 'Stock item saved.')}>Save</button>
                  <button className={ghost} onClick={() => setEditItem(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={i.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className={`font-bold ${i.lowStock ? 'text-red-300' : ''}`}>{i.name}</p>
                  <p className="text-sm text-neutral-400">{Number(i.quantity)} {i.unit} · reorder at {Number(i.reorderLevel)}{i.lowStock ? ' · low' : ''}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hasPermission('inventory.adjust') ? (
                    <>
                      <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, 1, 'Manual adjustment'), 'Stock updated.')}>+1</button>
                      <button className={ghost} onClick={() => act(() => managerApi.adjustStock(branchId, i.id, -1, 'Manual adjustment'), 'Stock updated.')}>−1</button>
                    </>
                  ) : null}
                  {hasPermission('inventory.update') ? (
                    <>
                      <button className={ghost} onClick={() => setEditItem({ id: i.id, name: i.name, unit: i.unit, reorderLevel: String(Number(i.reorderLevel)) })}>Edit</button>
                      <button className={ghost} onClick={() => confirmThen(`Remove ${i.name} from stock? Its history is kept.`, () => act(() => managerApi.archiveItem(branchId, i.id), 'Stock item removed.'))}>Remove</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {data.inventory.length === 0 ? <Empty>No stock items yet.</Empty> : null}
          </section>
          {hasPermission('inventory.update') ? (
            <section className={`${card} h-fit space-y-2`}>
              <p className="font-bold">Add a stock item</p>
              <input className={field} placeholder="Name (e.g. Basmati Rice)" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              <input className={field} placeholder="Unit (kg, litre, piece)" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
              <input className={field} placeholder="Reorder level" inputMode="decimal" value={newItem.reorderLevel} onChange={(e) => setNewItem({ ...newItem, reorderLevel: num(e.target.value) })} />
              <button className={button} disabled={!newItem.name.trim() || !newItem.unit.trim() || newItem.reorderLevel === ''} onClick={() => act(async () => {
                await managerApi.addItem(branchId, { name: newItem.name.trim(), unit: newItem.unit.trim(), reorderLevel: Number(newItem.reorderLevel) })
                setNewItem({ name: '', unit: '', reorderLevel: '' })
              }, 'Stock item added.')}>Add item</button>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'tables' ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {data.tables.map((t) => editTable?.id === t.id ? (
              <div key={t.id} className={`${card} space-y-2`}>
                <input className={field} aria-label="Table label" value={editTable.label} onChange={(e) => setEditTable({ ...editTable, label: e.target.value })} />
                <input className={field} aria-label="Seats" inputMode="numeric" value={editTable.capacity} onChange={(e) => setEditTable({ ...editTable, capacity: num(e.target.value) })} />
                <div className="flex gap-2">
                  <button className={button} onClick={() => act(async () => { await floorApi.updateTable(branchId, t.id, { label: editTable.label.trim(), capacity: Number(editTable.capacity) }); setEditTable(null) }, 'Table saved.')}>Save</button>
                  <button className={ghost} onClick={() => setEditTable(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div key={t.id} className={card}>
                <p className="font-bold">{t.label} <span className="text-sm font-normal text-neutral-400">· {t.capacity} seats</span></p>
                <p className="text-sm text-[#D4A63A]">{t.status}</p>
                <p className="mt-1 text-xs text-neutral-400">{t.waiter ? `Waiter: ${t.waiter}` : 'No waiter assigned'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hasPermission('tables.allocate') ? (
                    <>
                      <button className={ghost} onClick={() => setEditTable({ id: t.id, label: t.label, capacity: String(t.capacity) })}>Edit</button>
                      <button className={ghost} disabled={t.status !== 'AVAILABLE'} title={t.status !== 'AVAILABLE' ? 'Only available tables can be removed' : ''}
                        onClick={() => confirmThen(`Remove table ${t.label}?`, () => act(() => floorApi.deleteTable(branchId, t.id), 'Table removed.'))}>Remove</button>
                    </>
                  ) : null}
                </div>
                {hasPermission('tables.allocate') ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {TABLE_STATUSES.filter((s) => s !== t.status).map((s) => (
                      <button key={s} className={ghost} onClick={() => act(() => floorApi.setTableStatus(branchId, t.id, s), 'Table status updated.')}>{s}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {data.tables.length === 0 ? <Empty>No tables set up yet.</Empty> : null}
          </section>
          {hasPermission('tables.allocate') ? (
            <section className={`${card} h-fit space-y-2`}>
              <p className="font-bold">Add a table</p>
              <input className={field} placeholder="Label (e.g. T7)" value={newTable.label} onChange={(e) => setNewTable({ ...newTable, label: e.target.value })} />
              <input className={field} placeholder="Seats (1–30)" inputMode="numeric" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: num(e.target.value) })} />
              <button className={button} disabled={!newTable.label.trim()} onClick={() => act(async () => {
                await floorApi.createTable(branchId, { label: newTable.label.trim(), capacity: Number(newTable.capacity) })
                setNewTable({ label: '', capacity: '4' })
              }, 'Table added.')}>Add table</button>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'menu' ? (
        <section className="space-y-4">
          <p className="text-sm text-neutral-400">Prices are set by the Admin. Here you can rename dishes, edit their descriptions and switch them on or off for customers.</p>
          {data.menu.map((c) => (
            <div key={c.id ?? c.name} className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#D4A63A]">{c.name}</h3>
              {(c.items || []).map((i) => editMenu?.id === i.id ? (
                <div key={i.id} className={`${card} grid gap-2 sm:grid-cols-3`}>
                  <input className={field} aria-label="Dish name" value={editMenu.name} onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })} />
                  <input className={`${field} sm:col-span-1`} aria-label="Description" value={editMenu.description} onChange={(e) => setEditMenu({ ...editMenu, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button className={button} onClick={() => act(async () => { await menuApi.updateDetails(i.id, { name: editMenu.name.trim(), description: editMenu.description.trim() }); setEditMenu(null) }, 'Dish saved.')}>Save</button>
                    <button className={ghost} onClick={() => setEditMenu(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={i.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                  <div>
                    <p className={`font-bold ${i.available ? '' : 'text-neutral-500 line-through'}`}>{i.name} <span className="text-sm font-normal text-neutral-400">· ₹{money(i.price)}</span></p>
                    {i.description ? <p className="text-sm text-neutral-400">{i.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasPermission('menu.availability.update') ? (
                      <button className={ghost} onClick={() => act(() => menuApi.setAvailability(i.id, !i.available), i.available ? 'Dish switched off.' : 'Dish switched on.')}>
                        {i.available ? 'Switch off' : 'Switch on'}
                      </button>
                    ) : null}
                    {hasPermission('menu.update') ? (
                      <button className={ghost} onClick={() => setEditMenu({ id: i.id, name: i.name, description: i.description || '' })}>Edit</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {menuItems.length === 0 ? <Empty>The menu is empty.</Empty> : null}
        </section>
      ) : null}

      {tab === 'spending' ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h3 className="font-bold">Expenses to approve</h3>
            {pendingExpenses.map((e) => (
              <div key={e.id} className={`${card} space-y-2`}>
                {editExpense?.id === e.id ? (
                  <div className="space-y-2">
                    <input className={field} aria-label="Category" value={editExpense.category} onChange={(x) => setEditExpense({ ...editExpense, category: x.target.value })} />
                    <input className={field} aria-label="Amount" inputMode="decimal" value={editExpense.amount} onChange={(x) => setEditExpense({ ...editExpense, amount: num(x.target.value) })} />
                    <input className={field} aria-label="Description" value={editExpense.description} onChange={(x) => setEditExpense({ ...editExpense, description: x.target.value })} />
                    <div className="flex gap-2">
                      <button className={button} onClick={() => act(async () => { await managerApi.updateExpense(branchId, e.id, { category: editExpense.category.trim(), amount: Number(editExpense.amount), description: editExpense.description.trim() }); setEditExpense(null) }, 'Expense saved.')}>Save</button>
                      <button className={ghost} onClick={() => setEditExpense(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{e.category} · ₹{money(e.amount)}</p>
                    <p className="text-sm text-neutral-400">{e.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {hasPermission('expenses.approve') && e.created_by !== user?.id ? (
                        <>
                          <button className={button} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, true), 'Expense approved.')}>Approve</button>
                          <button className={ghost} onClick={() => act(() => managerApi.decideExpense(branchId, e.id, false), 'Expense rejected.')}>Reject</button>
                        </>
                      ) : null}
                      {e.created_by === user?.id ? (
                        <>
                          <button className={ghost} onClick={() => setEditExpense({ id: e.id, category: e.category, amount: String(Number(e.amount)), description: e.description })}>Edit</button>
                          <button className={ghost} onClick={() => confirmThen('Delete this expense?', () => act(() => managerApi.deleteExpense(branchId, e.id), 'Expense deleted.'))}>Delete</button>
                        </>
                      ) : null}
                    </div>
                    {e.created_by !== user?.id && !hasPermission('expenses.approve') ? <p className="text-xs text-neutral-500">Waiting for an administrator to approve.</p> : null}
                  </>
                )}
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
                <input className={field} placeholder="Amount" inputMode="decimal" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: num(e.target.value) })} />
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
              <div key={s.userId} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <span>{s.fullName}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {hasPermission('staff.update') && s.role !== 'ADMIN' ? (
                    <>
                      <select className={field} style={{ width: 'auto' }} aria-label={`Role for ${s.fullName}`}
                        value={roleDraft[s.userId] ?? s.role} onChange={(e) => setRoleDraft({ ...roleDraft, [s.userId]: e.target.value })}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                      <button className={ghost} disabled={(roleDraft[s.userId] ?? s.role) === s.role}
                        onClick={() => act(async () => { await managerApi.changeStaffRole(branchId, s.userId, roleDraft[s.userId]); setRoleDraft({ ...roleDraft, [s.userId]: undefined }) }, 'Role updated.')}>Save role</button>
                    </>
                  ) : <span className="text-sm text-neutral-400">{s.role}</span>}
                  {hasPermission('staff.disable') ? (
                    <button className={ghost} onClick={() => confirmThen(`Remove ${s.fullName} from this branch?`, () => act(() => managerApi.disableStaff(branchId, s.userId), 'Access removed for this branch.'))}>Remove</button>
                  ) : null}
                </div>
              </div>
            ))}
            {data.staff.length === 0 ? <Empty>No staff listed.</Empty> : null}
          </section>
          {hasPermission('staff.create') ? (
            <section className={`${card} h-fit space-y-2`}>
              <p className="font-bold">Add a staff member</p>
              <input className={field} placeholder="Full name" value={newStaff.fullName} onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })} />
              <input className={field} placeholder="Email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
              <input className={field} type="password" placeholder="Password (10+ characters)" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
              <select className={field} value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
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
