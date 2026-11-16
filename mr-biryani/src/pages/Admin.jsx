import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { adminApi } from '../api/staff'

// Admin console: role templates and their permission keys. The server refuses changes that would lock out
// Admin, give Manager administration keys, or give staff customer-only keys. This page shows those errors.

const card = 'rounded-xl border border-[#D4A63A]/20 bg-[#111010] p-4'
const button = 'rounded-lg bg-[#D4A63A] px-3 py-2 text-sm font-bold text-black hover:bg-[#E8BD57] disabled:opacity-40'
const ghost = 'rounded-lg border border-white/15 px-3 py-2 text-sm text-neutral-200 hover:border-[#D4A63A]'

export default function Admin() {
  const [roles, setRoles] = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(new Set())
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([adminApi.roles(), adminApi.permissions()])
      .then(([r, p]) => {
        setRoles(r)
        setCatalogue(p)
        setSelected(r[0]?.code ?? null)
        setDraft(new Set(r[0]?.permissions ?? []))
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load roles.'))
  }, [])

  const role = roles.find((r) => r.code === selected)

  const groups = useMemo(() => {
    const byModule = {}
    for (const p of catalogue) {
      if (filter && !p.key.includes(filter.toLowerCase())) continue
      ;(byModule[p.module] ??= []).push(p)
    }
    return Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b))
  }, [catalogue, filter])

  const toggle = (key) => {
    setDraft((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const save = async () => {
    setError(''); setNotice(''); setBusy(true)
    try {
      const saved = await adminApi.updateRolePermissions(selected, [...draft])
      setRoles((current) => current.map((r) => (r.code === selected ? { ...r, permissions: saved.permissions } : r)))
      setNotice(`${role.name} permissions saved. Changes apply on the next request.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The permissions could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const dirty = role && (draft.size !== role.permissions.length || role.permissions.some((p) => !draft.has(p)))

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold">Admin <span className="text-[#D4A63A]">console</span></h1>
          <Link to="/staff" className="text-sm font-bold text-[#D4A63A]">Staff workspace →</Link>
        </div>
        {error ? <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
        {notice ? <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{notice}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-2">
            <h2 className="font-bold">Roles</h2>
            {roles.map((r) => (
              <button key={r.code} onClick={() => { setSelected(r.code); setDraft(new Set(r.permissions)); setNotice(''); setError('') }}
                aria-current={selected === r.code ? 'true' : undefined}
                className={`${selected === r.code ? 'border-[#D4A63A] text-[#D4A63A]' : 'border-white/10 text-neutral-200'} block w-full rounded-lg border px-3 py-2 text-left`}>
                {r.name} <span className="text-xs text-neutral-500">{r.permissions.length} keys</span>
              </button>
            ))}
          </aside>

          {role ? (
            <section className="space-y-4">
              <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="text-lg font-bold">{role.name}</p>
                  <p className="text-sm text-neutral-400">{draft.size} of {catalogue.length} keys granted</p>
                </div>
                <div className="flex gap-2">
                  <button className={ghost} onClick={() => setDraft(new Set(role.permissions))} disabled={!dirty}>Discard</button>
                  <button className={button} onClick={save} disabled={!dirty || busy}>{busy ? 'Saving…' : 'Save changes'}</button>
                </div>
              </div>
              <input className="w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-white outline-none focus:border-[#D4A63A]"
                placeholder="Filter keys, for example orders or payments" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter permission keys" />
              {groups.map(([module, keys]) => (
                <div key={module} className={card}>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wider text-[#D4A63A]">{module}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {keys.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-neutral-200">
                        <input type="checkbox" checked={draft.has(p.key)} onChange={() => toggle(p.key)} />
                        <span className="font-mono text-xs">{p.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <p className="text-neutral-400">Loading roles…</p>
          )}
        </div>
      </div>
    </main>
  )
}
