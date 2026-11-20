import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, RotateCcw, Check, Sparkles, AlertCircle, CheckCircle2, ArrowLeft, Lock } from 'lucide-react'
import { ApiError } from '../api/client'
import { adminApi } from '../api/staff'
import { useAuth } from '../auth/AuthContext'

const ADMIN_REQUIRED = new Set(['roles.manage', 'roles.permissions.update', 'users.manage', 'permissions.manage'])

const ADMIN_ONLY = new Set([
  'users.manage', 'roles.manage', 'roles.permissions.update', 'permissions.manage',
  'settings.manage', 'integrations.manage', 'security.manage',
  'chat.knowledge.read', 'chat.knowledge.manage', 'chat.knowledge.publish'
])

const CUSTOMER_MODULE = new Set([
  'customer.profile.read_own', 'customer.profile.update_own',
  'orders.create_own', 'orders.read_own', 'orders.track_own',
  'reservations.manage_own', 'bills.read_own', 'payments.pay_own', 'recommendations.read'
])

const SYSTEM_DEFAULTS = {
  CUSTOMER: [
    'menu.read',
    'customer.profile.read_own', 'customer.profile.update_own',
    'orders.create_own', 'orders.read_own', 'orders.track_own',
    'reservations.manage_own', 'bills.read_own', 'payments.pay_own', 'recommendations.read'
  ],
  WAITER: [
    'profile.read_own', 'profile.update_own', 'menu.read',
    'orders.create', 'orders.read', 'orders.update', 'orders.send_to_kitchen',
    'tables.read', 'reservations.read', 'kitchen.orders.read',
    'service.status.read', 'service.status.update'
  ],
  RECEPTIONIST: [
    'profile.read_own', 'profile.update_own', 'menu.read',
    'orders.read', 'reservations.create', 'reservations.read', 'reservations.update',
    'reservations.confirm', 'reservations.cancel', 'reservations.check_in',
    'tables.read', 'tables.allocate', 'tables.transfer', 'tables.release',
    'floor.read', 'service.status.read'
  ],
  CAPTAIN: [
    'profile.read_own', 'profile.update_own', 'menu.read',
    'orders.create', 'orders.read', 'orders.update', 'orders.send_to_kitchen', 'orders.cancel',
    'reservations.create', 'reservations.read', 'reservations.update', 'reservations.confirm',
    'reservations.check_in', 'tables.read', 'tables.allocate', 'tables.assign', 'tables.transfer',
    'tables.release', 'floor.read', 'floor.supervise', 'floor.assign_waiter',
    'kitchen.orders.read', 'kitchen.orders.coordinate', 'service.status.read', 'service.status.update',
    'inventory.read'
  ],
  CASHIER: [
    'profile.read_own', 'profile.update_own', 'menu.read',
    'orders.create', 'orders.read', 'tables.read', 'reservations.read', 'service.status.read',
    'billing.generate', 'billing.read', 'billing.split', 'billing.reprint',
    'payments.collect', 'payments.read', 'payments.refund', 'discounts.apply'
  ],
  MANAGER: [
    'profile.read_own', 'profile.update_own', 'menu.read',
    'orders.create', 'orders.read', 'orders.update', 'orders.send_to_kitchen', 'orders.cancel', 'orders.cancel.approve',
    'tables.read', 'tables.allocate', 'tables.assign', 'tables.transfer', 'tables.release',
    'reservations.create', 'reservations.read', 'reservations.update', 'reservations.confirm', 'reservations.cancel', 'reservations.check_in',
    'floor.read', 'floor.supervise', 'floor.assign_waiter',
    'kitchen.orders.read', 'kitchen.orders.coordinate', 'service.status.read', 'service.status.update',
    'billing.generate', 'billing.read', 'billing.split', 'billing.reprint',
    'payments.collect', 'payments.read', 'payments.refund', 'payments.refund.approve', 'payments.reconcile',
    'discounts.apply', 'discounts.approve',
    'staff.read', 'staff.create', 'staff.update', 'staff.disable', 'staff.assign_responsibility',
    'inventory.read', 'inventory.update', 'inventory.adjust', 'inventory.purchase.manage',
    'expenses.read', 'expenses.create', 'expenses.approve',
    'feedback.read', 'feedback.moderate',
    'reports.sales.read', 'reports.revenue.read', 'reports.inventory.read', 'reports.staff_performance.read', 'reports.export'
  ]
}

const card = 'rounded-2xl border border-white/10 bg-[#111010] p-5 shadow-lg'

export default function Admin() {
  const { refreshPermissions } = useAuth()
  const [roles, setRoles] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(new Set())
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([adminApi.roles(), adminApi.permissions()])
      const roleList = Array.isArray(r) ? r : []
      setRoles(roleList)
      setCatalogue(Array.isArray(p) ? p : [])
      if (roleList.length > 0) {
        setSelected(roleList[0].code)
        setDraft(new Set(roleList[0].permissions || []))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load roles and permissions.')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const role = useMemo(() => roles.find((r) => r.code === selected), [roles, selected])

  const selectRole = (code) => {
    const target = roles.find((r) => r.code === code)
    setSelected(code)
    setDraft(new Set(target?.permissions || []))
    setNotice('')
    setError('')
  }

  // Permission eligibility check per role
  const isKeyEligible = useCallback((key, roleCode) => {
    if (!roleCode) return false
    if (roleCode === 'ADMIN') return true
    if (roleCode === 'CUSTOMER') {
      return CUSTOMER_MODULE.has(key) || key === 'menu.read'
    }
    // Staff roles: cannot have Admin-only keys or Customer self-service keys
    if (ADMIN_ONLY.has(key)) return false
    if (CUSTOMER_MODULE.has(key)) return false
    return true
  }, [])

  const isKeyLocked = useCallback((key, roleCode) => {
    if (roleCode === 'ADMIN' && ADMIN_REQUIRED.has(key)) return true
    return false
  }, [])

  const groups = useMemo(() => {
    const byModule = {}
    for (const p of catalogue) {
      if (filter && !p.key.toLowerCase().includes(filter.toLowerCase()) && !p.module.toLowerCase().includes(filter.toLowerCase())) {
        continue
      }
      ;(byModule[p.module] ??= []).push(p)
    }
    return Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b))
  }, [catalogue, filter])

  const toggle = (key) => {
    if (isKeyLocked(key, selected)) return
    if (!isKeyEligible(key, selected)) return

    setDraft((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const applyDefaults = () => {
    if (!selected) return
    const defaults = SYSTEM_DEFAULTS[selected] || []
    setDraft(new Set(defaults))
    setNotice(`Reset ${role?.name || selected} to system baseline defaults. Click 'Save changes' to apply.`)
    setError('')
  }

  const selectAllEligible = () => {
    if (!selected) return
    const next = new Set(draft)
    for (const p of catalogue) {
      if (isKeyEligible(p.key, selected)) {
        next.add(p.key)
      }
    }
    setDraft(next)
  }

  const save = async () => {
    if (!selected || !role) return
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const response = await adminApi.updateRolePermissions(selected, [...draft])
      const updatedKeys = response?.permissions || response?.data?.permissions || [...draft]

      setRoles((current) =>
        current.map((r) => (r.code === selected ? { ...r, permissions: updatedKeys } : r))
      )
      setDraft(new Set(updatedKeys))
      setNotice(`✅ Permissions successfully updated for ${role.name}. Changes apply immediately across all sessions.`)

      // Refresh current user permissions in case admin's own permissions changed
      if (refreshPermissions) {
        await refreshPermissions().catch(() => {})
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The permissions could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const rolePermissions = role?.permissions || []
  const dirty = Boolean(
    role && (draft.size !== rolePermissions.length || rolePermissions.some((p) => !draft.has(p)))
  )

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4A63A]" />
              <p className="text-xs font-bold uppercase tracking-[2px] text-[#D4A63A]">Access Control & Governance</p>
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">
              Role & <span className="text-[#D4A63A]">Permissions Console</span>
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Customize operational capabilities, service rules, and permissions across restaurant staff and customer roles.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            <span>My Dashboard</span>
          </Link>
        </div>

        {/* Notices & Errors */}
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-bold">Could not update permissions</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <p className="font-medium">{notice}</p>
          </div>
        )}

        {/* Main Grid: Left = Roles, Right = Permissions Matrix */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Roles Selector Sidebar */}
          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Restaurant Roles</h2>
              <span className="text-xs text-neutral-500">{roles.length} roles</span>
            </div>

            <div className="space-y-1.5">
              {roles.map((r) => {
                const isCurrent = selected === r.code
                const count = (r.permissions || []).length
                return (
                  <button
                    key={r.code}
                    onClick={() => selectRole(r.code)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                      isCurrent
                        ? 'border-[#D4A63A] bg-gradient-to-r from-[#D4A63A]/15 to-[#D4A63A]/5 text-white font-bold shadow-md shadow-[#D4A63A]/10'
                        : 'border-white/10 bg-[#111010] text-neutral-300 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm">{r.name}</p>
                      <p className="text-[11px] font-mono text-neutral-400">{r.code}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isCurrent ? 'bg-[#D4A63A] text-black' : 'bg-white/10 text-neutral-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Permissions Matrix */}
          {role ? (
            <section className="space-y-5">
              {/* Role Action Bar */}
              <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{role.name}</h2>
                    <span className="rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#E0B246]">
                      {role.code}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    <span className="font-bold text-[#E0B246]">{draft.size}</span> of {catalogue.length} total permissions enabled
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={applyDefaults}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition"
                    title="Reset role to factory defaults"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={selectAllEligible}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4A63A]/30 bg-[#141210] px-3 py-2 text-xs font-semibold text-[#D4A63A] hover:bg-[#D4A63A]/10 transition"
                  >
                    <Sparkles size={13} />
                    <span>Select All Eligible</span>
                  </button>

                  <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || busy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E0B246] to-[#C39327] px-4 py-2 text-xs font-bold text-black shadow-lg shadow-[#D4A63A]/20 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
                  >
                    <Check size={14} className="stroke-[3]" />
                    <span>{busy ? 'Saving Changes…' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Search filter input */}
              <input
                className="w-full rounded-xl border border-white/10 bg-[#100f0e] px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#D4A63A] transition"
                placeholder="Search permission keys or module (e.g. orders, reservations, billing, tables)..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter permission keys"
              />

              {/* Module Groups */}
              <div className="space-y-4">
                {groups.map(([module, keys]) => (
                  <div key={module} className={card}>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#D4A63A]">
                        {module} Module
                      </p>
                      <span className="text-[11px] text-neutral-500">
                        {keys.filter((k) => draft.has(k.key)).length} / {keys.length} active
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {keys.map((p) => {
                        const isGranted = draft.has(p.key)
                        const eligible = isKeyEligible(p.key, selected)
                        const locked = isKeyLocked(p.key, selected)

                        let badgeText = ''
                        let badgeColor = ''

                        if (locked) {
                          badgeText = 'System Required'
                          badgeColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        } else if (ADMIN_ONLY.has(p.key) && selected !== 'ADMIN') {
                          badgeText = 'Admin Only'
                          badgeColor = 'text-neutral-500 bg-neutral-800 border-neutral-700'
                        } else if (CUSTOMER_MODULE.has(p.key) && selected !== 'CUSTOMER') {
                          badgeText = 'Customer Only'
                          badgeColor = 'text-neutral-500 bg-neutral-800 border-neutral-700'
                        }

                        return (
                          <div
                            key={p.key}
                            onClick={() => eligible && !locked && toggle(p.key)}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition select-none ${
                              !eligible
                                ? 'border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed'
                                : locked
                                ? 'border-amber-500/20 bg-amber-500/5 cursor-default'
                                : isGranted
                                ? 'border-[#D4A63A]/40 bg-[#D4A63A]/10 cursor-pointer hover:border-[#D4A63A]'
                                : 'border-white/5 bg-black/40 cursor-pointer hover:border-white/20'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              disabled={!eligible || locked}
                              onChange={() => toggle(p.key)}
                              className="mt-0.5 rounded accent-[#D4A63A] cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`font-mono text-xs ${isGranted ? 'font-bold text-white' : 'text-neutral-300'}`}>
                                  {p.key}
                                </span>
                                {badgeText && (
                                  <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${badgeColor} inline-flex items-center gap-0.5`}>
                                    {locked && <Lock size={9} />}
                                    <span>{badgeText}</span>
                                  </span>
                                )}
                              </div>
                              {p.description && (
                                <p className="mt-0.5 text-[11px] text-neutral-400 line-clamp-1">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="py-20 text-center text-sm text-neutral-400">Loading roles and permissions…</div>
          )}
        </div>
      </div>
    </main>
  )
}
