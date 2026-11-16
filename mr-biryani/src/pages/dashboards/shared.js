import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { branchApi } from '../../api/staff'

// Shared helpers for the role dashboards (no components here; see ui.jsx).
// Each dashboard calls only the APIs its role may use; the server checks every request again.

export const today = () => new Date().toISOString().slice(0, 10)
export const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
export const money = (v) => Number(v ?? 0).toFixed(2)
export const errorText = (err, fallback) => (err instanceof ApiError ? err.message : fallback)
export const shortId = (id) => `#${String(id).slice(0, 8).toUpperCase()}`
export const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const card = 'rounded-xl border border-[#D4A63A]/20 bg-[#111010] p-4'
export const button = 'rounded-lg bg-[#D4A63A] px-3 py-2 text-sm font-bold text-black hover:bg-[#E8BD57] disabled:opacity-40'
export const ghost = 'rounded-lg border border-white/15 px-3 py-2 text-sm text-neutral-200 hover:border-[#D4A63A] disabled:opacity-40'
export const field = 'w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2 text-white outline-none focus:border-[#D4A63A]'

// Order flow used by the kitchen-facing roles.
export const ORDER_NEXT = {
  PLACED: { to: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
  SERVED: { to: 'COMPLETED', label: 'Complete' },
}

export const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']

// The restaurant has one branch today; the first branch the server returns is used.
export function useBranch() {
  const [branchId, setBranchId] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    branchApi.list()
      .then((list) => setBranchId(list[0]?.id ?? null))
      .catch((err) => setError(errorText(err, 'Could not load the branch.')))
  }, [])
  return { branchId, error }
}
