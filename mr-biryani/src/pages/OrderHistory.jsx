import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { getMockSession } from '../utils/mockAuth'
import { getOrdersForUser } from '../utils/mockOrders'

function OrderHistory() {
  const navigate = useNavigate()
  const [user] = useState(() => getMockSession())
  useEffect(() => { if (!user) navigate('/login', { replace: true }) }, [user, navigate])
  if (!user) return null
  const orders = getOrdersForUser(user.id).slice().reverse()
  return <main className="min-h-screen bg-[#080808] px-4 py-14 text-white sm:px-6"><div className="mx-auto max-w-4xl"><p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Your activity</p><h1 className="mt-3 font-serif text-4xl font-bold">Order <span className="text-[#D4A63A]">History</span></h1>{orders.length ? <div className="mt-9 space-y-4">{orders.map((order)=><article key={order.id} className="rounded-2xl border border-white/10 bg-[#111010] p-5 sm:p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">Order #{order.id.slice(0,8).toUpperCase()}</p><p className="mt-1 text-xs text-neutral-500">{new Date(order.createdAt).toLocaleString()}</p></div><span className="h-fit rounded-full border border-[#D4A63A]/30 px-3 py-1 text-xs text-[#D4A63A]">{order.status}</span></div><div className="mt-5 space-y-2 border-t border-white/10 pt-4">{order.items.map((item)=><p key={item.id} className="flex justify-between gap-3 text-sm text-neutral-300"><span>{item.name} × {item.quantity}</span><span>₹{item.price*item.quantity}</span></p>)}</div><p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-bold"><span>Total</span><span className="text-[#D4A63A]">₹{order.total}</span></p></article>)}</div> : <div className="mt-9 rounded-2xl border border-white/10 bg-[#111010] p-10 text-center"><ClipboardList size={40} className="mx-auto text-[#D4A63A]"/><h2 className="mt-4 text-xl font-bold">No orders yet</h2><p className="mt-2 text-sm text-neutral-400">Your completed demo checkouts will appear here.</p><Link to="/menu" className="mt-6 inline-flex rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">Explore menu</Link></div>}<p className="mt-8 text-xs text-neutral-600">Demo order history is stored locally in this browser. No restaurant order is actually submitted.</p></div></main>
}
export default OrderHistory
