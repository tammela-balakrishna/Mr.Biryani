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

export const DEFAULT_POS_MENU = [
  {
    category: 'Biryani (Serve for One)',
    items: [
      { id: '88d525d0-1bac-1195-692e-6c3c017e4801', name: 'Hyderabadi Dum Biryani', price: 170, category: 'Biryani' },
      { id: 'mbs-1', name: 'Mr.Biryani Special', price: 200, category: 'Biryani' },
      { id: '3d91121b-b7db-3356-afb3-ab28af11b0ca', name: 'Fry-Piece Chicken Biryani', price: 180, category: 'Biryani' },
      { id: 'gcb-1', name: 'Guntur Chicken Biryani', price: 180, category: 'Biryani' },
      { id: 'ncb-1', name: 'Nellore Chicken Biryani', price: 180, category: 'Biryani' },
      { id: 'mb-1', name: 'Mutton Biryani', price: 240, category: 'Biryani' },
      { id: 'pb-1', name: 'Paneer Biryani', price: 160, category: 'Biryani' },
    ],
  },
  {
    category: 'Non-Veg Starters',
    items: [
      { id: 'acf-1', name: 'Andhra Chicken Fry', price: 180, category: 'Starters' },
      { id: 'gcf-1', name: 'Guntur Chicken Fry', price: 180, category: 'Starters' },
      { id: 'ncf-1', name: 'Nellore Chicken Fry', price: 180, category: 'Starters' },
      { id: 'cgr-1', name: 'Chicken Ghee Roast', price: 180, category: 'Starters' },
      { id: 'amf-1', name: 'Andhra Mutton Fry', price: 240, category: 'Starters' },
      { id: 'mpd-1', name: 'Mutton Pepper Dry', price: 240, category: 'Starters' },
      { id: 'aff-1', name: 'Andhra Fish Fry', price: 220, category: 'Starters' },
      { id: 'pgr-1', name: 'Prawns Ghee Roast', price: 240, category: 'Starters' },
    ],
  },
  {
    category: 'Family Pack Biryani',
    items: [
      { id: 'fp-hdb', name: 'Hyderabadi Dum Biryani (Family)', price: 460, category: 'Family Pack' },
      { id: 'fp-mbs', name: 'Mr.Biryani Special (Family)', price: 550, category: 'Family Pack' },
      { id: 'fp-fpb', name: 'Fry-Piece Chicken Biryani (Family)', price: 490, category: 'Family Pack' },
      { id: 'fp-mb', name: 'Mutton Biryani (Family)', price: 670, category: 'Family Pack' },
    ],
  },
]

// The restaurant has one branch today; the first branch the server returns is used.
export function useBranch() {
  const [branchId, setBranchId] = useState('86841c23-a243-4282-bb0d-65415b68ae36')
  const [error] = useState('')
  useEffect(() => {
    branchApi.list()
      .then((list) => {
        if (list && list[0]?.id) setBranchId(list[0].id)
      })
      .catch((err) => {
        console.warn('Could not load branch from server, using default:', err)
      })
  }, [])
  return { branchId, error }
}
