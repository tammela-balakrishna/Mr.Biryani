import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ShoppingCart,
  Star,
  Gem,
  Flame,
  MapPin,
  MenuSquare,
  Sparkles,
  Check,
  ChefHat,
  Smile,
  ThumbsUp,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
  CalendarDays,
  Utensils,
  Search,
  X,
} from 'lucide-react'
import { addToCart, getCart } from '../utils/cart'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { MotionStyles, Reveal, SafeImg } from '../components/Motion'

/* ---------- DATA & IMAGES ---------- */

const base = 'https://images.unsplash.com'
const IMG = {
  bg: `${base}/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=80`,
  hero: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=80`,
  dum: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=80`,
  fry: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=400&q=80`,
  special: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80`,
  mutton: `${base}/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=80`,
  menuBg: `${base}/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1920&q=80`,
  aboutMain: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80`,
  biryani: `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=700&q=80`,
  family: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=85`,
  starters: `${base}/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85`,
}

const specialties = [
  { name: 'Hyderabadi\nDum Biryani', image: IMG.dum },
  { name: 'Fry-Piece Chicken\nBiryani', image: IMG.fry },
  { name: 'Mr. Biryani\nSpecial', image: IMG.special },
  { name: 'Mutton Biryani', image: IMG.mutton },
]

const highlights = [
  'Authentic Andhra Taste & Heirloom Spices',
  'Generous Portions for Family & Friends',
  'Great Value for Money & Fresh Quality',
  'Warm & Friendly Casual Dining Ambience',
]

const promises = [
  {
    icon: ChefHat,
    title: 'Authentic\nTaste',
    description: 'Slow-cooked traditional recipes using freshly ground spices.',
  },
  {
    icon: ThumbsUp,
    title: 'Quality\nFood',
    description: 'Fresh ingredients, premium basmati rice, and tender meat.',
  },
  {
    icon: Smile,
    title: 'Happy\nCustomers',
    description: 'Over 5,000+ 5-star reviews from satisfied food lovers.',
  },
]

const DEFAULT_MENU = [
  {
    id: 'biryani-serve-for-one',
    name: 'Biryani (Serve for One)',
    items: [
      { id: '88d525d0-1bac-1195-692e-6c3c017e4801', name: 'Hyderabadi Dum Biryani', price: 170, description: 'Traditional slow dum-cooked chicken with fragrant aged basmati rice and royal spices.', available: true },
      { id: 'mbs-1', name: 'Mr.Biryani Special', price: 200, description: 'Chef special boneless spicy chicken biryani infused with Andhra chili aroma.', available: true },
      { id: '3d91121b-b7db-3356-afb3-ab28af11b0ca', name: 'Fry-Piece Chicken Biryani', price: 180, description: 'Crispy fried Andhra spiced chicken pieces layered over steaming biryani rice.', available: true },
      { id: 'gcb-1', name: 'Guntur Chicken Biryani', price: 180, description: 'Fiery red chili marinade with authentic Guntur regional spices.', available: true },
      { id: 'ncb-1', name: 'Nellore Chicken Biryani', price: 180, description: 'Coastal Andhra delicacy cooked with tangy gongura and hand-pounded spices.', available: true },
      { id: 'mb-1', name: 'Mutton Biryani', price: 240, description: 'Tender baby mutton pieces marinated in rich curd and spices, slow dum-cooked.', available: true },
      { id: 'pb-1', name: 'Panner Biryani', price: 160, description: 'Fresh malai paneer cubes tossed in rich biryani gravy and aromatic rice.', available: true },
    ],
  },
  {
    id: 'non-veg-starters',
    name: 'Non-Veg Starters',
    items: [
      { id: 'acf-1', name: 'Andhra Chicken Fry', price: 180, description: 'Deep-fried chicken sauteed with curry leaves, green chilies, and crushed pepper.', available: true },
      { id: 'gcf-1', name: 'Guntur Chicken Fry', price: 180, description: 'Hot and spicy roasted chicken flavored with authentic Guntur red chilies.', available: true },
      { id: 'ncf-1', name: 'Nellore Chicken Fry', price: 180, description: 'Coastal Andhra special spiced chicken with intense garlic and pepper tempering.', available: true },
      { id: 'cgr-1', name: 'Chicken Ghee Roast', price: 180, description: 'Slow-roasted chicken in pure desi ghee with a rich tangy masala paste.', available: true },
      { id: 'amf-1', name: 'Andhra Mutton Fry', price: 240, description: 'Tender succulent mutton pieces dry roasted with caramelized onions and Andhra spices.', available: true },
      { id: 'mpd-1', name: 'Mutton Pepper Dry', price: 240, description: 'Crushed black pepper and roasted spices coating soft boneless mutton.', available: true },
      { id: 'aff-1', name: 'Andhra Fish Fry', price: 220, description: 'Crispy pan-fried fish fillets coated with traditional Andhra spice marinade.', available: true },
      { id: 'pgr-1', name: 'Prawns Ghee Roast', price: 240, description: 'Juicy prawns tossed in aromatic ghee and fiery Kundapur-style masala.', available: true },
    ],
  },
  {
    id: 'family-pack-biryani',
    name: 'Family Pack Biryani (Serve for 3 to 4 Persons)',
    items: [
      { id: 'fp-hdb', name: 'Hyderabadi Dum Biryani (Family)', price: 460, description: 'Generous feast of Hyderabadi dum biryani served with raita and mirchi ka salan.', available: true },
      { id: 'fp-mbs', name: 'Mr.Biryani Special (Family)', price: 550, description: 'Large portion of chef special chicken biryani perfect for 3 to 4 people.', available: true },
      { id: 'fp-fpb', name: 'Fry-Piece Chicken Biryani (Family)', price: 490, description: 'Heaping portions of biryani topped with double spicy fry pieces.', available: true },
      { id: 'fp-mb', name: 'Mutton Biryani (Family)', price: 670, description: 'Generous royal mutton biryani prepared with choice cuts and saffron rice.', available: true },
    ],
  },
]

const imageFor = (categoryName) => {
  if (/family/i.test(categoryName)) return IMG.family
  if (/starter/i.test(categoryName)) return IMG.starters
  return IMG.biryani
}

export default function Home({ initialSection }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('tableId')
  const branchId = searchParams.get('branchId')

  // Menu State
  const menuRef = useRef(null)
  const [menuInView, setMenuInView] = useState(false)
  const [menu, setMenu] = useState(DEFAULT_MENU)
  const [activeCategory, setActiveCategory] = useState(DEFAULT_MENU[0].name)
  const [menuSearch, setMenuSearch] = useState('')
  const [loadError, setLoadError] = useState('')
  const [cart, setCart] = useState(() => getCart())
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const [cartBarCollapsed, setCartBarCollapsed] = useState(false)

  // Track if Menu Section is in viewport so cart bar only appears in Menu section
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setMenuInView(entry.isIntersecting)
      },
      { threshold: 0.05, rootMargin: '-60px 0px -60px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Smooth scroll to initial section if specified
  useEffect(() => {
    if (initialSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(initialSection)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialSection])

  // Fetch Menu from API (updates live from database)
  useEffect(() => {
    api.get('/api/v1/menu')
      .then((data) => {
        const categories = data?.categories || []
        if (categories.length > 0) {
          setMenu(categories)
          setActiveCategory((curr) => {
            const exists = categories.some((c) => c.name === curr)
            return exists ? curr : categories[0].name
          })
          setLoadError('')
        }
      })
      .catch((err) => {
        // Log softly without blocking the rendered fallback menu
        console.warn('Live menu sync notice:', err)
      })
  }, [])

  // Sync Cart
  useEffect(() => {
    const handleCartSync = () => setCart(getCart())
    window.addEventListener('cart-updated', handleCartSync)
    window.addEventListener('storage', handleCartSync)
    return () => {
      window.removeEventListener('cart-updated', handleCartSync)
      window.removeEventListener('storage', handleCartSync)
    }
  }, [])

  const categories = useMemo(() => menu.map((c) => c.name), [menu])

  // Filter menu items
  const filteredItems = useMemo(() => {
    const category = menu.find((c) => c.name === activeCategory)
    let items = (category?.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      subtitle: item.description || '',
      price: item.price,
      image: imageFor(activeCategory),
      category: activeCategory,
      available: item.available,
    }))

    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase()
      // If searching, search across all categories
      const allItems = menu.flatMap((c) =>
        (c.items || []).map((item) => ({
          id: item.id,
          name: item.name,
          subtitle: item.description || '',
          price: item.price,
          image: imageFor(c.name),
          category: c.name,
          available: item.available,
        }))
      )
      items = allItems.filter(
        (i) => i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
      )
    }

    return items
  }, [menu, activeCategory, menuSearch])

  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  const totalCartPrice = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  )

  const getItemCartQty = (id) => cart.find((x) => x.id === id)?.quantity || 0

  const handleAddToCart = (item) => {
    addToCart({ id: item.id, name: item.name, price: item.price })
    setRecentlyAddedId(item.id)
    setCartBarCollapsed(false)
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

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <main
      className="min-h-screen font-sans relative text-white"
      style={{
        backgroundImage: `url('${IMG.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <MotionStyles />

      {/* Global dark overlay for contrast */}
      <div className="absolute inset-0 bg-[#0c0503]/85 z-0" />

      {/* Custom Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Montserrat:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800&display=swap');
        .font-script { font-family: 'Dancing Script', cursive; }
        .font-display { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* ======================================================== */}
      {/* 1. HERO SECTION                                         */}
      {/* ======================================================== */}
      <section id="home" className="relative w-full overflow-hidden pt-8 pb-16 lg:pb-24 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-8 lg:pt-12 flex flex-col lg:flex-row items-center relative z-10">
          
          {/* Left Text Content */}
          <div className="w-full lg:w-1/2 flex flex-col items-start pt-6 lg:pt-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/40 bg-[#D4A63A]/10 px-4 py-1.5 mb-6 backdrop-blur-md">
              <Sparkles className="text-[#D4A63A] w-4 h-4" fill="#D4A63A" />
              <span className="font-display font-bold text-xs tracking-[0.2em] uppercase text-[#E0B246]">
                House of Andhra Flavours
              </span>
            </div>

            <div className="flex flex-col items-start leading-none mb-3">
              <div className="flex items-baseline gap-3">
                <span className="font-script text-[#E0B246] text-6xl md:text-8xl drop-shadow-md">
                  Mr.
                </span>
                <span className="font-display font-black italic text-[#E0B246] text-5xl md:text-7xl tracking-wide drop-shadow-md">
                  BIRIYANI
                </span>
              </div>
              <h1 className="font-display font-black text-white text-3xl md:text-[2.75rem] tracking-tight mt-4 uppercase drop-shadow-lg">
                House of Andhra Flavours
              </h1>
            </div>

            <p className="font-display font-bold text-[#E0B246] text-xl md:text-2xl mt-4 drop-shadow-md">
              Authentic. Spicy. Unforgettable.
            </p>
            <p className="font-display text-gray-200 font-medium text-sm md:text-base max-w-lg mt-3 leading-relaxed drop-shadow-md">
              Experience the rich taste of authentic Andhra & Hyderabadi Biryani in BTM 1st Stage, Bengaluru. Prepared with heirloom spices and traditional slow dum cooking.
            </p>

            {/* Hero Quick Navigation Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={() => scrollToSection('menu')}
                className="bg-[#D4A63A] hover:bg-[#E8BD57] text-black font-display font-bold py-3.5 px-7 rounded-xl flex items-center gap-2.5 transition-all shadow-lg shadow-[#D4A63A]/25 active:scale-95"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Order Now</span>
              </button>

              <button
                onClick={() => scrollToSection('menu')}
                className="bg-black/60 border border-[#D4A63A]/60 hover:bg-[#D4A63A]/20 text-[#E0B246] font-display font-bold py-3.5 px-6 rounded-xl flex items-center gap-2 transition-all backdrop-blur-md active:scale-95"
              >
                <MenuSquare className="w-5 h-5" />
                <span>Explore Menu</span>
              </button>

              <button
                onClick={() => scrollToSection('about')}
                className="rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-display font-semibold py-3.5 px-5 flex items-center gap-2 transition-all backdrop-blur-md active:scale-95"
              >
                <Utensils className="w-4 h-4 text-[#D4A63A]" />
                <span>Our Story</span>
              </button>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="w-full lg:w-1/2 mt-12 lg:mt-0 relative flex justify-center lg:justify-end">
            <div className="relative w-[300px] h-[300px] md:w-[480px] md:h-[480px]">
              <div className="absolute inset-0 bg-[#D4A63A]/20 rounded-full blur-[90px]" />
              <img
                src={IMG.hero}
                alt="Delicious Biryani"
                className="relative w-full h-full object-cover rounded-full shadow-2xl border-4 border-[#3a1508]/60 transition-transform duration-700 hover:rotate-3"
                style={{
                  maskImage: 'radial-gradient(circle, black 65%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(circle, black 65%, transparent 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES BANNER --- */}
      <section className="relative bg-[#141210] w-full py-6 px-4 border-y border-[#D4A63A]/30 z-20 shadow-xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-white/10">
          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Star className="text-[#D4A63A] w-9 h-9" fill="#D4A63A" />
            <div className="font-display text-white">
              <p className="font-bold text-base leading-tight">4.5+ Rating</p>
              <p className="text-xs text-neutral-400">(5k+ Happy Reviews)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Gem className="text-[#D4A63A] w-9 h-9" />
            <p className="font-display font-bold text-base text-white leading-tight">
              Generous<br />Portions
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Flame className="text-[#D4A63A] w-9 h-9" fill="#D4A63A" />
            <p className="font-display font-bold text-base text-white leading-tight">
              Authentic<br />Andhra Taste
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <MapPin className="text-[#D4A63A] w-9 h-9" />
            <p className="font-display font-bold text-base text-white leading-tight">
              BTM 1st Stage,<br />Bengaluru
            </p>
          </div>
        </div>
      </section>

      {/* --- OUR SPECIALTIES GRID --- */}
      <section className="relative py-16 px-6 z-10 bg-gradient-to-t from-black/60 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-12">
            <div className="h-[2px] w-16 md:w-32 bg-gradient-to-l from-[#D4A63A] to-transparent" />
            <h2 className="font-serif font-bold text-white text-2xl md:text-3xl tracking-wide drop-shadow-md">
              Chef Specialties
            </h2>
            <div className="h-[2px] w-16 md:w-32 bg-gradient-to-r from-[#D4A63A] to-transparent" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {specialties.map((item, i) => (
              <div
                key={i}
                onClick={() => {
                  scrollToSection('menu')
                  const match = categories.find((c) => /biryani/i.test(c))
                  if (match) setActiveCategory(match)
                }}
                className="flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-full p-1 bg-gradient-to-b from-[#D4A63A]/40 to-[#110502]/80 transition-transform duration-300 group-hover:scale-105 shadow-xl">
                  <img
                    src={item.image}
                    alt={item.name.replace('\n', ' ')}
                    className="w-full h-full object-cover rounded-full border-2 border-[#110502]"
                  />
                </div>
                <h3 className="font-display font-bold text-white text-sm md:text-base mt-4 whitespace-pre-line group-hover:text-[#E0B246] transition-colors drop-shadow-md">
                  {item.name}
                </h3>
                <span className="mt-1 text-xs text-[#D4A63A] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  View in Menu &rarr;
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. MENU SECTION                                          */}
      {/* ======================================================== */}
      <section
        id="menu"
        ref={menuRef}
        className={`relative pt-16 px-4 sm:px-6 lg:px-8 z-10 border-t border-white/10 bg-[#0a0807]/90 backdrop-blur-md transition-all duration-300 ${
          totalCartCount > 0 && menuInView ? 'pb-36 sm:pb-44' : 'pb-16'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Menu Section Header */}
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-[4px] text-[#D4A63A]">
                FRESHLY PREPARED
              </span>
              <h2 className="mt-2 font-serif text-3xl sm:text-5xl font-bold text-white drop-shadow-md">
                {tableId ? 'Dining Table Menu' : 'Our Authentic Menu'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-neutral-300">
                {tableId
                  ? 'Select delicacies to send directly to the kitchen ticket for your table.'
                  : 'A rich celebration of Andhra spices, heirloom biryani dum recipes, and tantalizing starters.'}
              </p>

              {/* Decorative Divider */}
              <div className="flex items-center justify-center gap-3 my-6 opacity-90">
                <span className="h-[1px] w-20 bg-[#D4A63A]" />
                <div className="flex gap-1.5 items-center">
                  <span className="h-1.5 w-1.5 rounded-full border border-[#D4A63A]" />
                  <span className="h-2.5 w-2.5 rotate-45 border border-[#D4A63A] bg-[#D4A63A]" />
                  <span className="h-1.5 w-1.5 rounded-full border border-[#D4A63A]" />
                </div>
                <span className="h-[1px] w-20 bg-[#D4A63A]" />
              </div>
            </div>
          </Reveal>

          {/* Table ticket indicator if tableId is present in query parameters */}
          {tableId && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4A63A]/40 bg-[#16120e] p-4 shadow-xl">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-sm font-semibold text-white">
                  Active Table Ticket: <span className="text-[#E0B246] font-mono">#{tableId.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A63A] hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            </div>
          )}

          {/* Search & Category Pills */}
          <div className="space-y-4 mb-8 max-w-4xl mx-auto">
            {/* Search Box */}
            <div className="relative max-w-md mx-auto">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                className="w-full rounded-xl border border-white/15 bg-black/60 py-2.5 pl-10 pr-10 text-sm text-white placeholder-neutral-400 outline-none backdrop-blur-md focus:border-[#D4A63A]"
                placeholder="Search biryanis, starters, special dishes..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
              {menuSearch ? (
                <button
                  onClick={() => setMenuSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Category Filter Pills (when not searching) */}
            {!menuSearch.trim() && (
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {categories.map((category) => {
                  const isActive = activeCategory === category
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 backdrop-blur-sm ${
                        isActive
                          ? 'bg-[#D4A63A] text-black font-bold shadow-lg shadow-[#D4A63A]/25 scale-105'
                          : 'border border-white/10 bg-white/5 text-neutral-300 hover:border-[#D4A63A]/50 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {loadError && (
            <p role="alert" className="mx-auto my-6 max-w-md rounded-xl bg-red-500/15 p-3 text-center text-sm text-red-200 border border-red-500/30">
              {loadError}
            </p>
          )}

          {/* Dish Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map((item, i) => {
              const qtyInCart = getItemCartQty(item.id)
              const isJustAdded = recentlyAddedId === item.id

              return (
                <Reveal key={item.id} delay={Math.min(i * 40, 300)}>
                  <article className="rounded-2xl border border-white/10 bg-[#161412] p-4 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D4A63A]/50 hover:shadow-2xl hover:shadow-black/70 h-full relative group">
                    {qtyInCart > 0 && (
                      <span className="absolute top-3 right-3 z-10 rounded-full bg-black/90 px-2.5 py-0.5 text-xs font-bold text-[#E0B246] shadow-md border border-[#D4A63A]/40">
                        {qtyInCart} in ticket
                      </span>
                    )}

                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-3.5 bg-neutral-900 shadow-inner">
                      <SafeImg
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex flex-col flex-1 w-full justify-between items-center">
                      <div className="mb-2">
                        <h3 className="font-serif font-bold text-white text-sm sm:text-base leading-snug mb-1 line-clamp-1">
                          {item.name}
                        </h3>
                        {item.subtitle ? (
                          <p className="text-neutral-400 text-xs font-medium line-clamp-2">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>

                      <p className="font-mono font-bold text-lg text-[#E0B246] mb-3">
                        ₹{item.price}
                      </p>

                      <button
                        type="button"
                        disabled={!item.available}
                        onClick={() => handleAddToCart(item)}
                        className={`font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all w-max mt-auto shadow-sm flex items-center justify-center gap-1.5 active:scale-95 ${
                          !item.available
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                            : isJustAdded
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                            : 'bg-[#D4A63A] hover:bg-[#E8BD57] text-black shadow-md hover:shadow-lg hover:shadow-[#D4A63A]/20'
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

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-neutral-400">
              No dishes found matching your search.
            </div>
          )}

          {/* --- FLOATING CART BAR: EXCLUSIVELY SHOWN IN MENU SECTION --- */}
          {totalCartCount > 0 && menuInView && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl transition-all duration-300">
              {cartBarCollapsed ? (
                /* Collapsed Compact Pill to give 100% full card visibility */
                <div className="flex justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setCartBarCollapsed(false)}
                    className="flex items-center gap-2 rounded-full border border-[#D4A63A]/70 bg-[#111010]/95 px-4 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-xl transition hover:scale-105 active:scale-95 ring-1 ring-[#D4A63A]/30"
                  >
                    <ShoppingBag className="h-4 w-4 text-[#D4A63A]" />
                    <span>{totalCartCount} in ticket (₹{totalCartPrice.toFixed(2)})</span>
                    <span className="rounded-full bg-[#D4A63A] px-2 py-0.5 text-[10px] text-black font-extrabold">&uarr; View Ticket</span>
                  </button>
                </div>
              ) : (
                /* Sleek & Compact Floating Cart Bar with Guaranteed Spacing */
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A63A]/50 bg-[#111010]/95 p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-[#D4A63A]/25">
                  <div className="flex items-center gap-2.5 pl-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4A63A] text-black font-bold shadow-md">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}</span>
                        {tableId && (
                          <span className="rounded bg-[#D4A63A]/20 px-1.5 py-0.5 text-[10px] text-[#D4A63A] font-semibold">
                            #{tableId.slice(0, 6).toUpperCase()}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-semibold text-[#D4A63A]">₹{totalCartPrice.toFixed(2)} total</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={proceedToOrder}
                      className="flex items-center gap-1.5 rounded-xl bg-[#D4A63A] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold text-black transition-all hover:bg-[#E8BD57] hover:scale-105 active:scale-95 shadow-md shadow-[#D4A63A]/20"
                    >
                      <span>{tableId ? 'Review Ticket' : 'Checkout'}</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartBarCollapsed(true)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:text-white transition"
                      title="Minimize cart bar to view cards"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. ABOUT US SECTION                                      */}
      {/* ======================================================== */}
      <section id="about" className="relative py-20 px-5 sm:px-8 lg:px-12 z-10 border-t border-white/10 bg-[#0d0908]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            
            {/* Left Column: Story Content */}
            <Reveal className="flex flex-col items-start max-w-xl">
              <span className="text-xs font-bold uppercase tracking-[4px] text-[#D4A63A]">
                THE HERITAGE
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold tracking-wide mt-2 mb-2 drop-shadow-md text-white">
                About Mr. Biryani
              </h2>
              <h3 className="text-lg sm:text-xl font-semibold text-[#E0B246] mb-4">
                House of Andhra Flavours
              </h3>

              {/* Decorative Divider */}
              <div className="flex items-center gap-2 mb-6 opacity-90">
                <span className="h-[2px] w-12 bg-[#D4A63A]" />
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full border border-[#D4A63A]" />
                  <span className="h-2 w-2 rounded-full border border-[#D4A63A]" />
                </div>
                <span className="h-[2px] w-12 bg-[#D4A63A]" />
              </div>

              <p className="mb-4 text-base leading-relaxed text-neutral-200">
                Mr. Biryani is a highly rated, celebrated dining destination in the BTM 1st Stage / Madiwala area of Bengaluru, cherished for bringing the fiery, authentic spices of Andhra Pradesh and the royal richness of Hyderabadi Dum cooking to food lovers.
              </p>
              <p className="mb-6 text-sm leading-relaxed text-neutral-400">
                Every biryani is slow dum-cooked in heavy copper handis, infusing aged long-grain basmati rice with freshly ground whole spices, marinated succulent meats, and authentic Andhra herbs.
              </p>

              {/* Highlights List */}
              <div className="space-y-3.5 mb-8 w-full">
                {highlights.map((item, i) => (
                  <Reveal key={item} delay={100 + i * 80}>
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4A63A] text-black shadow-sm font-bold">
                        <Check size={14} strokeWidth={3.5} />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-neutral-100">
                        {item}
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/reservations"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D4A63A] px-6 py-3 text-sm font-bold text-black transition duration-300 hover:bg-[#E8BD57] hover:shadow-lg hover:shadow-[#D4A63A]/20 active:scale-95"
                >
                  <CalendarDays size={16} />
                  <span>Reserve a Table</span>
                </Link>
                <button
                  onClick={() => scrollToSection('menu')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-neutral-200 hover:bg-white/10 active:scale-95"
                >
                  <span>Explore Menu</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>

            {/* Right Column: Visual Brand & Promises */}
            <Reveal className="flex flex-col gap-6">
              <div className="relative rounded-3xl overflow-hidden border border-[#D4A63A]/30 shadow-2xl">
                <SafeImg
                  src={IMG.aboutMain}
                  alt="Mr Biryani Kitchen and Dining"
                  className="w-full h-72 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-6">
                  <div>
                    <p className="font-serif text-lg font-bold text-white">Heirloom Recipes, Authentic Soul</p>
                    <p className="text-xs text-[#E0B246]">Slow-cooked in traditional handis every day</p>
                  </div>
                </div>
              </div>

              {/* Promises Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {promises.map((p, idx) => {
                  const Icon = p.icon
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-[#161311] p-4 text-center flex flex-col items-center justify-between"
                    >
                      <div className="h-10 w-10 rounded-full bg-[#D4A63A]/15 text-[#E0B246] flex items-center justify-center mb-2">
                        <Icon size={20} />
                      </div>
                      <h4 className="font-serif font-bold text-white text-sm whitespace-pre-line mb-1">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        {p.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Reveal>

          </div>
        </div>
      </section>
    </main>
  )
}
