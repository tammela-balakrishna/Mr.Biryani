import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Utensils, Layers, Eye, EyeOff, X, Edit3 } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { floorApi, managerApi, feedbackApi, menuApi } from '../../api/staff'
import { useBranch, card, button, ghost, field, money, daysAgo, today, errorText, TABLE_STATUSES } from './shared'
import { Message, Shell, Empty } from './ui'

// Manager: the branch's day. "Needs attention" shows what is waiting; tabs and attention cards
// are dynamically filtered to show only features permitted for the active role.
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
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newDish, setNewDish] = useState({ categoryId: '', name: '', description: '', price: '', taxRate: '5.0', available: true })
  const [newCat, setNewCat] = useState({ name: '', sortOrder: '0' })
  const [menuFilter, setMenuFilter] = useState('ALL')
  const [menuSearch, setMenuSearch] = useState('')
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

  const availableTabs = useMemo(() => {
    const list = [['overview', 'Overview']]
    if (hasPermission('inventory.read') || hasPermission('inventory.update') || hasPermission('inventory.adjust') || hasPermission('inventory.create')) {
      list.push(['stock', 'Stock'])
    }
    if (hasPermission('tables.read') || hasPermission('tables.allocate') || hasPermission('tables.assign')) {
      list.push(['tables', 'Tables'])
    }
    if (hasPermission('menu.read') || hasPermission('menu.update') || hasPermission('menu.create')) {
      list.push(['menu', 'Menu'])
    }
    if (hasPermission('expenses.read') || hasPermission('expenses.approve') || hasPermission('payments.refund.approve')) {
      list.push(['spending', 'Spending & refunds'])
    }
    if (hasPermission('staff.read') || hasPermission('staff.create')) {
      list.push(['team', 'Team'])
    }
    if (hasPermission('feedback.read') || hasPermission('feedback.moderate')) {
      list.push(['feedback', 'Feedback'])
    }
    return list
  }, [hasPermission])

  const currentTab = availableTabs.some(([id]) => id === tab) ? tab : (availableTabs[0]?.[0] || 'overview')

  const lowStock = data.inventory.filter((i) => i.lowStock)
  const pendingExpenses = data.expenses.filter((e) => e.status === 'PENDING')
  const maxDay = Math.max(1, ...data.daily.map((d) => d.net))
  const menuItems = data.menu.flatMap((c) => (c.items || []).map((i) => ({ ...i, category: c.name })))

  const attention = useMemo(() => {
    const items = []
    if (hasPermission('expenses.read') || hasPermission('expenses.approve')) {
      items.push(['spending', 'Expenses to approve', pendingExpenses.length])
    }
    if (hasPermission('payments.refund.approve')) {
      items.push(['spending', 'Refunds to approve', data.refunds.length])
    }
    if (hasPermission('inventory.read')) {
      items.push(['stock', 'Low-stock items', lowStock.length])
    }
    if (hasPermission('feedback.read') || hasPermission('feedback.moderate')) {
      items.push(['feedback', 'Reviews to publish', data.reviews.length])
    }
    return items
  }, [hasPermission, pendingExpenses.length, data.refunds.length, lowStock.length, data.reviews.length])

  return (
    <Shell eyebrow="Branch manager" title="Manager dashboard" links={hasPermission('roles.manage') ? [['Admin', '/admin']] : []}>
      <Message text={branchError || error} />
      <Message text={notice} tone="ok" />

      {attention.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-bold">Needs your attention</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {attention.map(([target, label, count]) => (
              <button key={label} onClick={() => setTab(target)}
                className={`rounded-2xl border p-5 text-left transition-all duration-200 ${
                  count > 0 
                    ? 'border-[#D4A63A] bg-gradient-to-br from-[#1d1610] to-[#111010] shadow-lg shadow-[#D4A63A]/10' 
                    : 'border-white/10 bg-[#111010] hover:border-white/20'
                }`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                  {count > 0 && <span className="h-2 w-2 rounded-full bg-[#D4A63A] animate-ping" />}
                </div>
                <p className={`mt-3 text-3xl font-extrabold ${count > 0 ? 'text-[#D4A63A]' : 'text-neutral-500'}`}>{count}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#111010]/80 p-1.5 backdrop-blur-md">
        <nav className="flex flex-wrap gap-1.5" aria-label="Manager sections">
          {availableTabs.map(([id, label]) => {
            const isActive = currentTab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/25'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      {currentTab === 'overview' ? (
        <div className="grid gap-8 lg:grid-cols-3">
          <section className={`${card} space-y-4 ${hasPermission('inventory.read') ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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
          {hasPermission('inventory.read') && (
            <section className={`${card} space-y-3`}>
              <h3 className="font-bold">Low stock</h3>
              {lowStock.map((i) => <p key={i.id} className="text-red-300">{i.name}: {Number(i.quantity)} {i.unit}</p>)}
              {lowStock.length === 0 ? <Empty>All stock is above its reorder level.</Empty> : null}
            </section>
          )}
        </div>
      ) : null}

      {currentTab === 'stock' ? (
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

      {currentTab === 'tables' ? (
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

      {currentTab === 'menu' ? (
        <section className="space-y-6">
          {/* Top Bar: Title, description, and quick actions */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-[#171412] to-[#121110] p-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-[#D4A63A]" />
                <h3 className="font-serif text-xl font-bold text-neutral-100">Menu Studio & Catalog</h3>
              </div>
              <p className="mt-1 text-sm text-neutral-400">
                Manage Andhra signature delicacies, real-time availability, descriptions, and pricing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(hasPermission('menu.create') || hasPermission('menu.update')) ? (
                <>
                  <button
                    onClick={() => { setShowAddItem(!showAddItem); setShowAddCat(false) }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-[#D4A63A]/20 transition hover:brightness-110 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Dish</span>
                  </button>
                  <button
                    onClick={() => { setShowAddCat(!showAddCat); setShowAddItem(false) }}
                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-[#D4A63A]/50 hover:bg-white/10 active:scale-95"
                  >
                    <Layers className="h-4 w-4 text-[#D4A63A]" />
                    <span>Add Category</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Add Category Panel */}
          {showAddCat ? (
            <div className="rounded-2xl border border-[#D4A63A]/40 bg-gradient-to-b from-[#1c1815] to-[#111010] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#D4A63A]" />
                  <h4 className="font-serif text-lg font-bold text-white">Create New Menu Category</h4>
                </div>
                <button onClick={() => setShowAddCat(false)} className="rounded-lg p-1 text-neutral-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Category Name</label>
                  <input
                    className={field}
                    placeholder="e.g. Traditional Andhra Biryanis, Starters, Desserts"
                    value={newCat.name}
                    onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Display Order</label>
                  <input
                    className={field}
                    type="number"
                    placeholder="0"
                    value={newCat.sortOrder}
                    onChange={(e) => setNewCat({ ...newCat, sortOrder: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowAddCat(false)} className={ghost}>Cancel</button>
                <button
                  disabled={!newCat.name.trim()}
                  onClick={() => act(async () => {
                    await menuApi.addCategory({ name: newCat.name.trim(), sortOrder: Number(newCat.sortOrder || (data.menu.length + 1)) })
                    setNewCat({ name: '', sortOrder: '0' })
                    setShowAddCat(false)
                  }, 'Category created successfully.')}
                  className={button}
                >
                  Create Category
                </button>
              </div>
            </div>
          ) : null}

          {/* Add Dish Panel */}
          {showAddItem ? (
            <div className="rounded-2xl border border-[#D4A63A]/40 bg-gradient-to-b from-[#1c1815] to-[#111010] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-[#D4A63A]" />
                  <h4 className="font-serif text-lg font-bold text-white">Add New Dish to Menu</h4>
                </div>
                <button onClick={() => setShowAddItem(false)} className="rounded-lg p-1 text-neutral-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Category</label>
                  <select
                    className={field}
                    value={newDish.categoryId || (data.menu[0]?.id ?? '')}
                    onChange={(e) => setNewDish({ ...newDish, categoryId: e.target.value })}
                  >
                    {data.menu.map((c) => (
                      <option key={c.id ?? c.name} value={c.id} className="bg-neutral-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Dish Name</label>
                  <input
                    className={field}
                    placeholder="e.g. Andhra Gongura Mutton Biryani"
                    value={newDish.name}
                    onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Price (₹)</label>
                  <input
                    className={field}
                    placeholder="e.g. 290.00"
                    inputMode="decimal"
                    value={newDish.price}
                    onChange={(e) => setNewDish({ ...newDish, price: num(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Tax Rate (%)</label>
                  <input
                    className={field}
                    placeholder="5.0"
                    inputMode="decimal"
                    value={newDish.taxRate}
                    onChange={(e) => setNewDish({ ...newDish, taxRate: num(e.target.value) })}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">Description & Spice Profile</label>
                  <input
                    className={field}
                    placeholder="e.g. Slow-cooked tender mutton with tangy gongura leaves and fragrant basmati rice."
                    value={newDish.description}
                    onChange={(e) => setNewDish({ ...newDish, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200">
                    <input
                      type="checkbox"
                      checked={newDish.available}
                      onChange={(e) => setNewDish({ ...newDish, available: e.target.checked })}
                      className="h-4 w-4 rounded border-white/20 bg-neutral-800 text-[#D4A63A] focus:ring-[#D4A63A]"
                    />
                    <span>Available immediately</span>
                  </label>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowAddItem(false)} className={ghost}>Cancel</button>
                <button
                  disabled={!newDish.name.trim() || !newDish.price}
                  onClick={() => act(async () => {
                    const catId = newDish.categoryId || data.menu[0]?.id
                    if (!catId) throw new Error('Please select or create a category first.')
                    await menuApi.addItem({
                      categoryId: catId,
                      name: newDish.name.trim(),
                      description: newDish.description.trim(),
                      price: Number(newDish.price),
                      taxRate: Number(newDish.taxRate || 5.0),
                      available: newDish.available,
                    })
                    setNewDish({ categoryId: '', name: '', description: '', price: '', taxRate: '5.0', available: true })
                    setShowAddItem(false)
                  }, 'Dish added to menu.')}
                  className={button}
                >
                  Publish to Menu
                </button>
              </div>
            </div>
          ) : null}

          {/* Search Bar & Category Filter Pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                className={`${field} pl-10 pr-10`}
                placeholder="Search dishes by name or description..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
              {menuSearch ? (
                <button onClick={() => setMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white">
                  Clear
                </button>
              ) : null}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMenuFilter('ALL')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  menuFilter === 'ALL'
                    ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/20'
                    : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                All Dishes ({menuItems.length})
              </button>
              {data.menu.map((c) => {
                const count = (c.items || []).length
                const isActive = menuFilter === c.name || menuFilter === c.id
                return (
                  <button
                    key={c.id ?? c.name}
                    onClick={() => setMenuFilter(c.name)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/20'
                        : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Catalog Sections */}
          <div className="space-y-6">
            {data.menu
              .filter((c) => menuFilter === 'ALL' || menuFilter === c.name || menuFilter === c.id)
              .map((c) => {
                const filteredItems = (c.items || []).filter((i) => {
                  if (!menuSearch.trim()) return true
                  const q = menuSearch.toLowerCase()
                  return i.name?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
                })

                if (filteredItems.length === 0 && menuSearch.trim()) return null

                return (
                  <div key={c.id ?? c.name} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                      <div className="h-2 w-2 rounded-full bg-[#D4A63A]" />
                      <h4 className="font-serif text-lg font-bold text-[#D4A63A]">{c.name}</h4>
                      <span className="text-xs text-neutral-500">({filteredItems.length} items)</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredItems.map((i) => (
                        <div
                          key={i.id}
                          className={`rounded-2xl border p-4 transition-all duration-200 ${
                            i.available
                              ? 'border-white/10 bg-gradient-to-br from-[#151311] to-[#0d0c0c] hover:border-white/20'
                              : 'border-white/5 bg-[#0a0a0a]/80 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {editMenu?.id === i.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-400">Dish Name</label>
                                <input
                                  className={field}
                                  value={editMenu.name}
                                  onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-400">Price (₹)</label>
                                <input
                                  className={field}
                                  inputMode="decimal"
                                  value={editMenu.price}
                                  onChange={(e) => setEditMenu({ ...editMenu, price: num(e.target.value) })}
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-400">Description</label>
                                <input
                                  className={field}
                                  value={editMenu.description}
                                  onChange={(e) => setEditMenu({ ...editMenu, description: e.target.value })}
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button className={ghost} onClick={() => setEditMenu(null)}>Cancel</button>
                                <button
                                  className={button}
                                  onClick={() => act(async () => {
                                    await menuApi.updateDetails(i.id, {
                                      name: editMenu.name.trim(),
                                      description: editMenu.description.trim(),
                                    })
                                    if (editMenu.price && Number(editMenu.price) !== Number(i.price)) {
                                      await menuApi.updatePrice(i.id, Number(editMenu.price))
                                    }
                                    setEditMenu(null)
                                  }, 'Dish updated.')}
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full flex-col justify-between gap-3">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className={`font-semibold ${i.available ? 'text-white' : 'text-neutral-400 line-through'}`}>
                                    {i.name}
                                  </h5>
                                  <span className="shrink-0 rounded-lg bg-[#D4A63A]/15 px-2.5 py-0.5 font-mono text-sm font-bold text-[#E0B246]">
                                    ₹{money(i.price)}
                                  </span>
                                </div>
                                {i.description ? (
                                  <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{i.description}</p>
                                ) : (
                                  <p className="mt-1 text-xs italic text-neutral-600">No description provided</p>
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    i.available ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${i.available ? 'bg-green-400' : 'bg-neutral-500'}`} />
                                  {i.available ? 'Available' : 'Switched off'}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {hasPermission('menu.availability.update') ? (
                                    <button
                                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10 active:scale-95"
                                      onClick={() => act(() => menuApi.setAvailability(i.id, !i.available), i.available ? 'Dish switched off.' : 'Dish switched on.')}
                                      title={i.available ? 'Switch off for customer orders' : 'Make available for orders'}
                                    >
                                      {i.available ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-green-400" />}
                                      <span>{i.available ? 'Switch off' : 'Switch on'}</span>
                                    </button>
                                  ) : null}

                                  {(hasPermission('menu.update') || hasPermission('menu.price.update')) ? (
                                    <button
                                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-neutral-300 transition hover:border-[#D4A63A]/40 hover:bg-[#D4A63A]/10 hover:text-[#E0B246] active:scale-95"
                                      onClick={() => setEditMenu({ id: i.id, name: i.name, description: i.description || '', price: String(Number(i.price)) })}
                                      title="Edit dish name, description or price"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      <span>Edit</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

            {menuItems.length === 0 ? <Empty>The menu is empty. Click "+ Add Dish" above to create your first signature dish.</Empty> : null}
          </div>
        </section>
      ) : null}

      {currentTab === 'spending' ? (
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

      {currentTab === 'team' ? (
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

      {currentTab === 'feedback' ? (
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
