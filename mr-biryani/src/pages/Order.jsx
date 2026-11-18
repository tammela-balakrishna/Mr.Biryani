import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, CheckCircle2 } from 'lucide-react'
import { getCart, saveCart } from '../utils/cart'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError, newIdempotencyKey } from '../api/client'
import { ordersApi } from '../api/staff'

const field = 'w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none focus:border-[#D4A63A]'

function Order() {
  const navigate = useNavigate()
  
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('tableId')
  const urlBranchId = searchParams.get('branchId')

  const { status, hasPermission } = useAuth()
  const [cart, setCart] = useState(() => getCart())
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState(urlBranchId || '') 
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null)
  const [busy, setBusy] = useState(false)
  const attemptKey = useRef(null)

  const isStaff = hasPermission('orders.create')
  const isCustomer = hasPermission('orders.create_own')

  useEffect(() => {
    api.get('/api/v1/branches').then((list) => {
      setBranches(list)
      if (list.length === 1 && !urlBranchId) setBranchId(list[0].id)
    }).catch(() => setError('Could not load branches. Please refresh the page.'))
  }, [urlBranchId])

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart])

  const quantity = (item, delta) => setCart((current) => {
    const next = current.map((x) => (x.id === item.id ? { ...x, quantity: x.quantity + delta } : x)).filter((x) => x.quantity > 0)
    saveCart(next)
    attemptKey.current = null
    return next
  })

const submit = async (event) => {
    event.preventDefault()
    setError('')
    
    // Security redirect: Allow Customers OR Staff
    if (status !== 'authenticated' || (!isCustomer && !isStaff)) {
      navigate('/login', { state: { from: '/order' } })
      return
    }
    
    if (!cart.length) return setError('Your cart is empty.')
    if (!branchId) return setError('Choose a branch.')
    
    // Strict safeguard: Prevent Waiters from proceeding if tableId was lost from the URL
    if (isStaff && !tableId) {
      return setError('Table selection is missing. Please start over from the dashboard.')
    }

    attemptKey.current = attemptKey.current || newIdempotencyKey()
    setBusy(true)
    
    try {
      let order;
      
      if (isStaff) {
        // WAITER: Place order directly to the branch table endpoint & unwrap standard { data } response
        const response = await api.post(`/api/v1/branches/${branchId}/orders`, {
          tableId: tableId,
          items: cart.map((item) => ({ 
            menuItemId: item.id, 
            quantity: item.quantity 
          })),
        })
        order = response.data || response;
      } else {
        // CUSTOMER: Place standard online order
        const response = await api.post('/api/v1/orders', {
          branchId,
          items: cart.map((item) => ({ menuItemId: item.id, quantity: item.quantity })),
        }, { 'Idempotency-Key': attemptKey.current })
        order = response.data || response;
      }

      saveCart([])
      setCart([])
      setPlaced(order)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place the order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="bg-gradient-to-br from-[#321010] to-[#100c08] px-5 py-16 text-center">
        <ShoppingBag size={36} className="mx-auto mb-4 text-[#D4A63A]" />
        <h1 className="font-serif text-4xl font-bold sm:text-5xl">Your <span className="text-[#D4A63A]">Order</span></h1>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8">
        {placed ? (
          <div className="rounded-2xl border border-[#D4A63A]/30 bg-[#111010] p-10 text-center lg:col-span-2">
            <CheckCircle2 size={52} className="mx-auto text-[#D4A63A]" />
            <h2 className="mt-5 font-serif text-3xl font-bold">{isStaff ? 'Order Sent to Kitchen!' : 'Order placed'}</h2>
            <p className="mt-3 text-neutral-400">
              {isStaff 
                ? `Total ₹${total.toFixed(2)}` 
                : `Reference: ${placed.id.slice(0, 8).toUpperCase()} · Status: ${placed.status} · Total ₹${placed.total}`
              }
            </p>
            {!isStaff && <p className="mt-2 text-sm text-neutral-500">Payment is collected by the restaurant. No online payment was taken.</p>}
            
            <Link to={isStaff ? "/waiter" : "/orders"} className="mt-7 inline-flex rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">
              {isStaff ? "Back to Dashboard" : "View my orders"}
            </Link>
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-6 font-serif text-2xl font-bold">Selected <span className="text-[#D4A63A]">items</span></h2>
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111010] p-10 text-center">
                  <ShoppingBag size={40} className="mx-auto text-[#D4A63A]" />
                  <h3 className="mt-4 text-xl font-bold">Your cart is empty</h3>
                  <button onClick={() => navigate(-1)} className="mt-6 inline-flex rounded-lg bg-[#D4A63A] px-6 py-3 font-bold text-black">Back to Menu</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <article key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111010] p-4">
                      <div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-[#D4A63A]">₹{item.price} each</p></div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => quantity(item, -1)} aria-label={'Remove one ' + item.name} className="rounded-lg border border-white/15 p-2"><Minus size={15} /></button>
                        <strong>{item.quantity}</strong>
                        <button onClick={() => quantity(item, 1)} aria-label={'Add one ' + item.name} className="rounded-lg bg-[#D4A63A] p-2 text-black"><Plus size={15} /></button>
                        <button onClick={() => quantity(item, -item.quantity)} aria-label={'Remove ' + item.name} className="p-2 text-neutral-500 hover:text-red-300"><Trash2 size={16} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-2xl border border-[#D4A63A]/20 bg-[#111010] p-5 sm:p-7">
              <h2 className="font-serif text-2xl font-bold">Checkout</h2>
              <div className="mt-5 flex justify-between border-b border-white/10 pb-4 text-sm text-neutral-400"><span>Subtotal (before tax)</span><span>₹{total.toFixed(2)}</span></div>
              {!isStaff && <p className="mb-6 pt-3 text-xs text-neutral-500">Tax is calculated by the server when the order is placed.</p>}
              
              {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
              
              <form onSubmit={submit} className="space-y-4 pt-3">
                {!isStaff && (
                  <label className="block text-sm font-semibold text-neutral-300">Branch
                    <select className={field + ' mt-2'} value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                      <option value="">Choose a branch</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                )}

                <button disabled={!cart.length || busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A63A] px-5 py-4 font-bold text-black hover:bg-[#E8BD57] disabled:opacity-40">
                  {busy ? 'Processing…' : (isStaff ? 'Send to Kitchen' : 'Place order')} <ArrowRight size={18} />
                </button>
              </form>
            </aside>
          </>
        )}
      </section>
    </main>
  )
}

export default Order