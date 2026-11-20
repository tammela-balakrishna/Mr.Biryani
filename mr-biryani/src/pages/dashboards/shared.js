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

// Order flow used by the kitchen and floor staff. Note: COMPLETED is NOT a kitchen action;
// orders are completed only upon payment settlement at the Cashier till.
export const ORDER_NEXT = {
  PLACED: { to: 'ACCEPTED', label: 'Accept' },
  ACCEPTED: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
}

export const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']

export const DEFAULT_POS_MENU = [
  {
    category: 'Biryani (Serve for One)',
    items: [
      { id: '6b780b50-7a8e-80b3-94d2-fec1e5563d17', name: 'Hyderabadi Dum Biryani', price: 170, category: 'Biryani' },
      { id: '6f2fa89b-c15b-c2d4-423b-108709977154', name: 'Mr.Biryani Special', price: 200, category: 'Biryani' },
      { id: '646199df-094b-00d4-3d60-c34603d75e3f', name: 'Fry-Piece Chicken Biryani', price: 180, category: 'Biryani' },
      { id: '96d125f7-f8c7-4821-cc58-9b79254f292f', name: 'Guntur Chicken Biryani', price: 180, category: 'Biryani' },
      { id: '943e0a68-a602-f153-5306-9c5dbd9d8425', name: 'Nellore Chicken Biryani', price: 180, category: 'Biryani' },
      { id: '1e0cc9fe-76e6-2ff9-9c3d-b2e7ef0e37ef', name: 'Mutton Biryani', price: 240, category: 'Biryani' },
      { id: '992d10f4-85e2-5765-ddcc-648e19b3fb8c', name: 'Paneer Biryani', price: 160, category: 'Biryani' },
      { id: '672dbafd-e284-4e07-f54f-ebe294c2abcd', name: 'Egg Biryani', price: 130, category: 'Biryani' },
    ],
  },
  {
    category: 'Non-Veg Starters',
    items: [
      { id: '88d525d0-1bac-1195-692e-6c3c017e4801', name: 'Andhra Chicken Fry', price: 180, category: 'Starters' },
      { id: 'd467b1d1-92f5-affb-834e-7ce227429eb2', name: 'Guntur Chicken Fry', price: 180, category: 'Starters' },
      { id: 'dcee4c39-a65f-bb32-5333-6408545d7bcf', name: 'Nellore Chicken Fry', price: 180, category: 'Starters' },
      { id: 'd0b75fb7-9f62-7371-b68e-e7479e7140cd', name: 'Chicken Ghee Roast', price: 180, category: 'Starters' },
      { id: '032adde3-228b-0983-de4e-43e3ebb9d45d', name: 'Andhra Mutton Fry', price: 240, category: 'Starters' },
      { id: 'd3dd81a8-dea0-59e7-a508-e6f53ffe5975', name: 'Mutton Pepper Dry', price: 240, category: 'Starters' },
      { id: '05759be6-afc4-f225-213e-f1f8e9ff6329', name: 'Andhra Fish Fry', price: 220, category: 'Starters' },
      { id: 'bdd877b5-aea5-d376-b7a0-28de860c4505', name: 'Prawns Ghee Roast', price: 240, category: 'Starters' },
    ],
  },
  {
    category: 'Family Pack Biryani',
    items: [
      { id: 'da3e4eca-71ee-6458-1014-6bb49099947f', name: 'Hyderabadi Dum Biryani (Family)', price: 460, category: 'Family Pack' },
      { id: '80737202-fe00-6334-f658-efa9664cee29', name: 'Mr.Biryani Special (Family)', price: 550, category: 'Family Pack' },
      { id: 'ff64440b-c494-dca2-2ac1-0c0742c9c8e7', name: 'Fry-Piece Chicken Biryani (Family)', price: 490, category: 'Family Pack' },
      { id: '60c11c84-d1f2-1848-0262-4902fd6752e2', name: 'Mutton Biryani (Family)', price: 670, category: 'Family Pack' },
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
