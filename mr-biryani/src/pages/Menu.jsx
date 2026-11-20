import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Check, ArrowLeft } from 'lucide-react'
import { addToCart, getCart } from '../utils/cart'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { MotionStyles, Reveal, SafeImg } from '../components/Motion'
import { DEFAULT_MENU } from '../data/menuData'

const base = 'https://images.unsplash.com'
const images = {
  biryani: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=700&q=80`,
  family: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=85`,
  starters: `${base}/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85`,
  background: `${base}/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1920&q=80`,
}

const imageFor = (name) => (/family/i.test(name) ? images.family : /starter/i.test(name) ? images.starters : images.biryani)

function Menu() {
  const [menu, setMenu] = useState(DEFAULT_MENU)
  const [activeCategory, setActiveCategory] = useState(DEFAULT_MENU[0].name)
  const [loadError, setLoadError] = useState('')
  const [cart, setCart] = useState(() => getCart())
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const navigate = useNavigate()
  
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('tableId')
  const branchId = searchParams.get('branchId')
  const { hasPermission } = useAuth()

  useEffect(() => {
    api.get('/api/v1/menu')
      .then((data) => {
        if (data?.categories?.length > 0) {
          setMenu(data.categories)
          setActiveCategory((curr) => {
            const exists = data.categories.some((c) => c.name === curr)
            return exists ? curr : data.categories[0].name
          })
          setLoadError('')
        }
      })
      .catch((err) => {
        console.warn('Menu live sync notice:', err)
      })
  }, [])

  useEffect(() => {
    const handleCartSync = () => setCart(getCart())
    window.addEventListener('cart-updated', handleCartSync)
    window.addEventListener('storage', handleCartSync)
    return () => {
      window.removeEventListener('cart-updated', handleCartSync)
      window.removeEventListener('storage', handleCartSync)
    }
  }, [])

  const categories = menu.map((category) => category.name)

  const filteredItems = useMemo(() => {
    const category = menu.find((c) => c.name === activeCategory)
    return (category?.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      subtitle: item.description || '',
      price: item.price,
      image: imageFor(activeCategory),
      category: activeCategory,
      available: item.available,
    }))
  }, [menu, activeCategory])

  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const totalCartPrice = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart])

  const getItemCartQty = (id) => cart.find((x) => x.id === id)?.quantity || 0

  const handleAddToCart = (item) => {
    addToCart({ id: item.id, name: item.name, price: item.price })
    setRecentlyAddedId(item.id)
    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === item.id ? null : curr))
    }, 1200)
  }

  const proceedToOrder = () => {
    if (tableId && branchId && hasPermission('orders.create')) {
      navigate(`/order?tableId=${tableId}&branchId=${branchId}`)
    } else {
      navigate('/order')
    }
  }

  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <MotionStyles />

      <div 
        className="absolute inset-0 -z-20 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${images.background})` }}
      />
      <div className="absolute inset-0 -z-10 bg-black/80" />

      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-red-900/30 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-orange-900/30 via-transparent to-transparent pointer-events-none -z-10" />

      <section className="pt-16 pb-8 text-center relative z-10">
        <Reveal>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-wide drop-shadow-md">
            {tableId ? `Taking Order for Table` : 'Our Menu'}
          </h1>
          <p className="text-sm md:text-base text-neutral-200 mb-4 drop-shadow">
            {tableId ? 'Items added here will be sent directly to the kitchen.' : 'A perfect blend of tradition and taste'}
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-8 opacity-90">
            <span className="h-[1px] w-16 bg-[#FFD700]" />
            <div className="flex gap-1 items-center">
               <span className="h-1.5 w-1.5 rounded-full border border-[#FFD700]" />
               <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 0C14 4 18 6 24 6C18 6 14 8 12 12C10 8 6 6 0 6C6 6 10 4 12 0Z" fill="#FFD700"/>
               </svg>
               <span className="h-1.5 w-1.5 rounded-full border border-[#FFD700]" />
            </div>
            <span className="h-[1px] w-16 bg-[#FFD700]" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-4 max-w-4xl mx-auto">
            {categories.map((category) => {
              const isActive = activeCategory === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
                    isActive
                      ? 'bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20'
                      : 'bg-black/40 border border-white/20 text-white hover:border-[#FFD700] hover:text-[#FFD700]'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </Reveal>
      </section>

      {loadError && <p role="alert" className="mx-auto mt-6 max-w-md rounded-lg bg-red-500/15 p-3 text-center text-sm text-red-200">{loadError}</p>}
      
      <section className="max-w-6xl mx-auto px-4 pb-28 relative z-10">
        {tableId && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4A63A]/30 bg-[#111010]/80 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-semibold text-white">
                Active Table Ticket: <span className="text-[#FFD700]">#{tableId.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD700] hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
          {filteredItems.map((item, i) => {
            const qtyInCart = getItemCartQty(item.id)
            const isJustAdded = recentlyAddedId === item.id

            return (
              <Reveal key={item.id} delay={Math.min(i * 50, 400)}>
                <article className="bg-[#f8f9fa] rounded-xl p-4 flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 h-full relative group">
                  {qtyInCart > 0 && (
                    <span className="absolute top-2 right-2 z-10 rounded-full bg-[#111010] px-2.5 py-0.5 text-xs font-bold text-[#FFD700] shadow-md border border-[#FFD700]/30">
                      {qtyInCart} in ticket
                    </span>
                  )}

                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-4 bg-gray-200 shadow-inner">
                    <SafeImg
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex flex-col flex-1 w-full justify-between items-center">
                    <div className="mb-3">
                      <h3 className="text-black font-bold text-sm sm:text-base leading-snug mb-1 whitespace-pre-line">
                        {item.name}
                      </h3>
                      <p className="text-gray-500 text-xs font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                    
                    <p className="text-black font-extrabold text-lg sm:text-xl mb-4">
                      ₹{item.price}
                    </p>

                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => handleAddToCart(item)}
                      className={`font-bold text-sm px-5 py-2.5 rounded-full transition-all w-max mt-auto shadow-sm flex items-center justify-center gap-1.5 active:scale-95 ${
                        !item.available
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isJustAdded
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : 'bg-[#FFD700] hover:bg-[#E6C200] text-black shadow-md hover:shadow-lg'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check size={16} /> Added!
                        </>
                      ) : !item.available ? (
                        'Unavailable'
                      ) : tableId ? (
                        'Add to Ticket +'
                      ) : (
                        'Add +'
                      )}
                    </button>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* Sticky Bottom Floating Ticket / Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#D4A63A]/50 bg-[#111010]/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl ring-1 ring-[#D4A63A]/25">
            <div className="flex items-center gap-3 pl-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D4A63A] text-black font-bold shadow-md">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}</span>
                  {tableId && (
                    <span className="rounded-md bg-[#D4A63A]/20 px-2 py-0.5 text-[11px] text-[#D4A63A] font-semibold">
                      Table #{tableId.slice(0, 6).toUpperCase()}
                    </span>
                  )}
                </p>
                <p className="text-xs font-semibold text-[#D4A63A]">₹{totalCartPrice.toFixed(2)} total</p>
              </div>
            </div>

            <button
              onClick={proceedToOrder}
              className="flex items-center gap-2 rounded-xl bg-[#D4A63A] px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-bold text-black transition-all hover:bg-[#E8BD57] hover:scale-105 active:scale-95 shadow-lg shadow-[#D4A63A]/20"
            >
              <span>{tableId ? 'Review & Send Ticket' : 'Proceed to Checkout'}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Menu