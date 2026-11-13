import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserRound, ClipboardList, CalendarDays, LogOut } from 'lucide-react'
import { getMockSession, logoutMockUser } from '../utils/mockAuth'
import { getOrdersForUser, getReservationsForUser } from '../utils/mockOrders'

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => getMockSession())
  useEffect(() => { if (!user) navigate('/login', { replace: true }) }, [user, navigate])
  if (!user) return null
  const orders = getOrdersForUser(user.id)
  const reservations = getReservationsForUser(user.id)
  const signOut = () => { logoutMockUser(); setUser(null); navigate('/') }
  return <main className="min-h-screen bg-[#080808] px-4 py-14 text-white sm:px-6"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Your account</p><h1 className="mt-3 font-serif text-4xl font-bold">Welcome, <span className="text-[#D4A63A]">{user.name}</span></h1>
    <div className="mt-9 grid gap-6 md:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-white/10 bg-[#111010] p-6"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A63A]/15 text-[#D4A63A]"><UserRound size={28}/></div><h2 className="mt-5 text-xl font-bold">Personal details</h2><p className="mt-4 text-sm text-neutral-400">Name</p><p className="font-semibold">{user.name}</p><p className="mt-3 text-sm text-neutral-400">Mobile number</p><p className="font-semibold">+91 {user.phone}</p><p className="mt-3 text-sm text-neutral-400">Account type</p><p className="font-semibold capitalize">{user.role}</p><button onClick={signOut} className="mt-7 flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm text-neutral-300 hover:border-red-400 hover:text-red-300"><LogOut size={16}/> Sign out</button></section>
      <div className="space-y-6"><section className="rounded-2xl border border-white/10 bg-[#111010] p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold"><ClipboardList className="text-[#D4A63A]"/> Recent orders</h2><span className="text-sm text-neutral-500">{orders.length} total</span></div>{orders.length ? orders.slice().reverse().slice(0,3).map((order)=><div key={order.id} className="mt-4 flex justify-between gap-4 border-t border-white/10 pt-4 text-sm"><span>{order.items.map((item)=>item.name).join(', ')}</span><strong className="text-[#D4A63A]">₹{order.total}</strong></div>) : <p className="mt-4 text-sm text-neutral-500">No demo orders yet. <Link to="/menu" className="text-[#D4A63A]">Browse menu</Link>.</p>}<Link to="/orders" className="mt-5 inline-block text-sm font-bold text-[#D4A63A]">All orders →</Link></section>
      <section className="rounded-2xl border border-white/10 bg-[#111010] p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-[#D4A63A]"/> Reservations</h2><span className="text-sm text-neutral-500">{reservations.length} total</span></div>{reservations.length ? reservations.slice().reverse().slice(0,3).map((item)=><div key={item.id} className="mt-4 flex justify-between border-t border-white/10 pt-4 text-sm"><span>{item.date} · {item.time} · {item.guests} guests</span><span className="text-[#D4A63A]">{item.status}</span></div>) : <p className="mt-4 text-sm text-neutral-500">No reservations yet.</p>}<Link to="/reservations" className="mt-5 inline-block text-sm font-bold text-[#D4A63A]">Reserve a table →</Link></section></div>
    </div>
    <p className="mt-8 text-xs leading-5 text-neutral-600">Prototype account data is stored in this browser only. It is not secure authentication and does not sync between devices.</p>
  </div></main>
}
export default Profile
