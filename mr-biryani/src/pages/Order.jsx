import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, CheckCircle2 } from 'lucide-react'
import { getCart, saveCart } from '../utils/cart'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError, newIdempotencyKey } from '../api/client'

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
    let targetBranchId = branchId || (branches.length > 0 ? branches[0].id : '')
    if (!targetBranchId) return setError('Choose a branch.')
    
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
        const response = await api.post(`/api/v1/branches/${targetBranchId}/orders`, {
          tableId: tableId,
          items: cart.map((item) => ({ 
            menuItemId: item.id, 
            quantity: item.quantity 
          })),
        }, { 'Idempotency-Key': attemptKey.current })
        order = response.data || response;
      } else {
        // CUSTOMER: Place standard online order
        const response = await api.post('/api/v1/orders', {
          branchId: targetBranchId,
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

  const menuUrl = tableId && branchId ? `/menu?tableId=${tableId}&branchId=${branchId}` : '/menu'

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="bg-gradient-to-br from-[#321010] to-[#100c08] px-5 py-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#D4A63A]/5 to-transparent pointer-events-none" />
        
        {isStaff && tableId ? (
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#D4A63A] mb-3">
              <span>Staff Terminal</span>
              <span>•</span>
              <span>Table #{tableId.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="font-serif text-3xl font-bold sm:text-5xl">Kitchen <span className="text-[#D4A63A]">Ticket</span></h1>
            <p className="mt-2 text-sm text-neutral-300">Items placed will route immediately to the kitchen display</p>
          </div>
        ) : (
          <div className="relative z-10">
            <ShoppingBag size={36} className="mx-auto mb-3 text-[#D4A63A]" />
            <h1 className="font-serif text-4xl font-bold sm:text-5xl">Your <span className="text-[#D4A63A]">Order</span></h1>
            <p className="mt-2 text-sm text-neutral-400">Authentic Andhra flavours delivered fresh</p>
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:px-8">
        {placed ? (
          <div className="rounded-2xl border border-[#D4A63A]/40 bg-[#111010] p-10 text-center lg:col-span-2 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="mt-5 font-serif text-3xl font-bold">{isStaff ? 'Order Sent to Kitchen!' : 'Order Placed Successfully!'}</h2>
            <p className="mt-3 text-neutral-300">
              {isStaff 
                ? `Total: ₹${total.toFixed(2)} · Table #${tableId ? tableId.slice(0, 8).toUpperCase() : ''}` 
                : `Reference: ${placed.id.slice(0, 8).toUpperCase()} · Status: ${placed.status} · Total: ₹${placed.total}`
              }
            </p>
            {!isStaff && <p className="mt-2 text-sm text-neutral-500">Payment will be collected by the restaurant at delivery or dine-in.</p>}
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to={isStaff ? "/dashboard" : "/orders"} className="rounded-xl bg-[#D4A63A] px-6 py-3 font-bold text-black transition hover:bg-[#E8BD57] shadow-lg shadow-[#D4A63A]/20">
                {isStaff ? "Back to Dashboard" : "View My Orders"}
              </Link>
              <Link to={menuUrl} className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:border-[#D4A63A] hover:text-[#D4A63A]">
                {isStaff ? "Take Another Order" : "Explore More Dishes"}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold">Selected <span className="text-[#D4A63A]">items</span></h2>
                {cart.length > 0 && (
                  <Link to={menuUrl} className="text-sm font-semibold text-[#D4A63A] hover:underline">
                    + Add more dishes
                  </Link>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#111010] p-12 text-center">
                  <ShoppingBag size={44} className="mx-auto text-[#D4A63A]" />
                  <h3 className="mt-4 text-xl font-bold">Your cart is empty</h3>
                  <p className="mt-2 text-sm text-neutral-400">Add some delicious biryanis and starters from our menu.</p>
                  <Link to={menuUrl} className="mt-6 inline-flex rounded-xl bg-[#D4A63A] px-6 py-3 font-bold text-black transition hover:bg-[#E8BD57]">
                    Browse Menu
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <article key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111010] p-4 transition hover:border-white/20">
                      <div>
                        <h3 className="font-bold text-base">{item.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-[#D4A63A]">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => quantity(item, -1)} aria-label={'Remove one ' + item.name} className="rounded-lg border border-white/15 p-2 transition hover:bg-white/10"><Minus size={15} /></button>
                        <span className="w-6 text-center font-bold text-white">{item.quantity}</span>
                        <button onClick={() => quantity(item, 1)} aria-label={'Add one ' + item.name} className="rounded-lg bg-[#D4A63A] p-2 text-black transition hover:bg-[#E8BD57]"><Plus size={15} /></button>
                        <button onClick={() => quantity(item, -item.quantity)} aria-label={'Remove ' + item.name} className="p-2 text-neutral-500 hover:text-red-400 transition"><Trash2 size={16} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-2xl border border-[#D4A63A]/30 bg-[#111010] p-6 sm:p-7 shadow-xl">
              <h2 className="font-serif text-2xl font-bold">{isStaff ? 'Ticket Summary' : 'Checkout'}</h2>

              {isStaff && tableId && (
                <div className="mt-4 rounded-xl border border-[#D4A63A]/20 bg-[#D4A63A]/5 p-3 text-xs text-neutral-300 space-y-1">
                  <p className="font-bold text-[#D4A63A] uppercase tracking-wide">Dine-In Order</p>
                  <p>Table: <span className="font-mono font-bold text-white">#{tableId.slice(0, 8).toUpperCase()}</span></p>
                </div>
              )}

              <div className="mt-5 space-y-2.5 border-b border-white/10 pb-4 text-sm text-neutral-300">
                <div className="flex justify-between">
                  <span>Items count</span>
                  <span className="font-semibold text-white">{cart.reduce((s, x) => s + x.quantity, 0)} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">₹{total.toFixed(2)}</span>
                </div>
              </div>
              
              {!isStaff && <p className="mb-4 pt-3 text-xs text-neutral-400">Applicable taxes and service charges are calculated on placement.</p>}
              
              {error && <p role="alert" className="my-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
              
              <form onSubmit={submit} className="space-y-4 pt-2">
                {!isStaff && (
                  <label className="block text-sm font-semibold text-neutral-300">Branch
                    <select className={field + ' mt-2'} value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                      <option value="">Choose a branch</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </label>
                )}

                <button disabled={!cart.length || busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A63A] px-5 py-4 font-bold text-black hover:bg-[#E8BD57] active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-[#D4A63A]/20">
                  {busy ? 'Processing…' : (isStaff ? 'Send to Kitchen' : 'Place Order')} <ArrowRight size={18} />
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