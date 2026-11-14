import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, ClipboardList, CalendarDays, LogOut } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

function ProfileContent() {
  const { user, roles, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [reservations, setReservations] = useState([])

  useEffect(() => {
    api.get('/api/v1/orders').then(setOrders).catch(() => setOrders([]))
    api.get('/api/v1/reservations/mine').then(setReservations).catch(() => setReservations([]))
  }, [])

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-14 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Your account</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Welcome, <span className="text-[#D4A63A]">{user.fullName}</span></h1>
        <div className="mt-9 grid gap-6 md:grid-cols-[.8fr_1.2fr]">
          <section className="rounded-2xl border border-white/10 bg-[#111010] p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A63A]/15 text-[#D4A63A]"><UserRound size={28} /></div>
            <h2 className="mt-5 text-xl font-bold">Personal details</h2>
            <p className="mt-4 text-sm text-neutral-400">Email</p>
            <p className="font-semibold">{user.email}</p>
            {user.phone && <><p className="mt-3 text-sm text-neutral-400">Mobile</p><p className="font-semibold">{user.phone}</p></>}
            <p className="mt-3 text-sm text-neutral-400">Account type</p>
            <p className="font-semibold">{roles.includes('CUSTOMER') ? 'Customer' : roles.join(', ').toLowerCase()}</p>
            <button onClick={logout} className="mt-7 flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm text-neutral-300 hover:border-red-400 hover:text-red-300"><LogOut size={16} /> Sign out</button>
          </section>
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#111010] p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><ClipboardList className="text-[#D4A63A]" /> Recent orders</h2>
                <span className="text-sm text-neutral-500">{orders.length} total</span>
              </div>
              {orders.length ? orders.slice(0, 3).map((order) => (
                <div key={order.id} className="mt-4 flex justify-between gap-4 border-t border-white/10 pt-4 text-sm">
                  <span>{order.items.map((i) => i.name).join(', ')} · {order.status}</span>
                  <strong className="text-[#D4A63A]">₹{order.total}</strong>
                </div>
              )) : <p className="mt-4 text-sm text-neutral-500">No orders yet. <Link to="/menu" className="text-[#D4A63A]">Browse menu</Link>.</p>}
              <Link to="/orders" className="mt-5 inline-block text-sm font-bold text-[#D4A63A]">All orders →</Link>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#111010] p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-[#D4A63A]" /> Reservations</h2>
                <span className="text-sm text-neutral-500">{reservations.length} total</span>
              </div>
              {reservations.length ? reservations.slice(0, 3).map((r) => (
                <div key={r.id} className="mt-4 flex justify-between border-t border-white/10 pt-4 text-sm">
                  <span>{new Date(r.startsAt).toLocaleString()} · {r.partySize} guests</span>
                  <span className="text-[#D4A63A]">{r.status}</span>
                </div>
              )) : <p className="mt-4 text-sm text-neutral-500">No reservations yet.</p>}
              <Link to="/reservations" className="mt-5 inline-block text-sm font-bold text-[#D4A63A]">Reserve a table →</Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function Profile() {
  return <ProtectedRoute><ProfileContent /></ProtectedRoute>
}
