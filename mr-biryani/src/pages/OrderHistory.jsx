import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'
import { api, ApiError } from '../api/client'

function OrderHistoryContent() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/v1/orders').then(setOrders).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load orders.'))
  }, [])

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-14 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Your activity</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Order <span className="text-[#D4A63A]">History</span></h1>
        {error && <p role="alert" className="mt-6 text-sm text-red-300">{error}</p>}
        {orders === null && !error && <p className="mt-9 text-neutral-400">Loading…</p>}
        {orders?.length === 0 && (
          <div className="mt-9 rounded-2xl border border-white/10 bg-[#111010] p-10 text-center">
            <ClipboardList size={40} className="mx-auto text-[#D4A63A]" />
            <h2 className="mt-4 text-xl font-bold">No orders yet</h2>
            <Link to="/menu" className="mt-6 inline-flex rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">Explore menu</Link>
          </div>
        )}
        {orders?.length > 0 && (
          <div className="mt-9 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-white/10 bg-[#111010] p-5 sm:p-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="mt-1 text-xs text-neutral-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="h-fit rounded-full border border-[#D4A63A]/30 px-3 py-1 text-xs text-[#D4A63A]">{order.status}</span>
                </div>
                <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
                  {order.items.map((item) => (
                    <p key={item.menuItemId + item.name} className="flex justify-between gap-3 text-sm text-neutral-300">
                      <span>{item.name} × {item.quantity}</span><span>₹{item.lineSubtotal}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-bold"><span>Total (incl. tax)</span><span className="text-[#D4A63A]">₹{order.total}</span></p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default function OrderHistory() {
  return <ProtectedRoute><OrderHistoryContent /></ProtectedRoute>
}
