import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, 
  UtensilsCrossed, 
  ShoppingBag, 
  CalendarDays, 
  UserRound, 
  ClipboardList, 
  Star, 
  LayoutDashboard, 
  ShieldAlert, 
  MapPin, 
  Info, 
  PhoneCall, 
  LogOut, 
  Menu as MenuIcon, 
  X,
  ChevronRight
} from 'lucide-react'
import Brand from './Brand'
import { useAuth } from '../auth/AuthContext'
import { getCart } from '../utils/cart'

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartCount, setCartCount] = useState(() => getCart().reduce((n, x) => n + x.quantity, 0))
  const { user, roles, isStaff, hasPermission, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile drawer on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [location.pathname])

  // Sync cart counter
  useEffect(() => {
    const updateCount = () => {
      setCartCount(getCart().reduce((n, x) => n + x.quantity, 0))
    }
    updateCount()
    window.addEventListener('cart-updated', updateCount)
    window.addEventListener('storage', updateCount)
    return () => {
      window.removeEventListener('cart-updated', updateCount)
      window.removeEventListener('storage', updateCount)
    }
  }, [])

  const handleSignOut = async () => {
    setMobileOpen(false)
    await logout()
    navigate('/')
  }

  const roleLabel = roles.includes('CUSTOMER')
    ? 'Customer'
    : roles[0]
      ? roles[0].charAt(0) + roles[0].slice(1).toLowerCase()
      : 'Member'

  const userInitial = (user?.fullName || 'U').charAt(0).toUpperCase()

  const canReserve = hasPermission('reservations.manage_own') || hasPermission('reservations.create')
  const canOrder = hasPermission('orders.create_own') || hasPermission('orders.create')
  const canViewOrders = (hasPermission('orders.read_own') || hasPermission('orders.read')) && canOrder

  const navSectionClass = 'text-[11px] font-bold uppercase tracking-[1.5px] text-neutral-400 px-3 mb-2'
  const navItemClass = ({ isActive }) =>
    `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-[#D4A63A] text-black shadow-md shadow-[#D4A63A]/20 font-bold'
        : 'text-neutral-300 hover:text-white hover:bg-white/5'
    }`

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand & Tagline */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <Brand to="/" compact showText tone="dark" />
        <button 
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav Links Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <p className={navSectionClass}>Order & Dine</p>
          <nav className="space-y-1">
            <NavLink to="/" end className={navItemClass}>
              <span className="flex items-center gap-3">
                <Home size={18} />
                <span>Home</span>
              </span>
            </NavLink>

            <NavLink to="/menu" className={navItemClass}>
              <span className="flex items-center gap-3">
                <UtensilsCrossed size={18} />
                <span>Our Menu</span>
              </span>
            </NavLink>

            {canOrder && (
              <NavLink to="/order" className={navItemClass}>
                <span className="flex items-center gap-3">
                  <ShoppingBag size={18} />
                  <span>Cart / Order</span>
                </span>
                {cartCount > 0 && (
                  <span className="rounded-full bg-black/80 px-2 py-0.5 text-xs font-bold text-[#D4A63A]">
                    {cartCount}
                  </span>
                )}
              </NavLink>
            )}

            {canReserve && (
              <NavLink to="/reservations" className={navItemClass}>
                <span className="flex items-center gap-3">
                  <CalendarDays size={18} />
                  <span>Reservations</span>
                </span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Account Section */}
        <div>
          <p className={navSectionClass}>My Account</p>
          <nav className="space-y-1">
            <NavLink to="/profile" className={navItemClass}>
              <span className="flex items-center gap-3">
                <UserRound size={18} />
                <span>My Profile</span>
              </span>
            </NavLink>

            {canViewOrders && (
              <NavLink to="/orders" className={navItemClass}>
                <span className="flex items-center gap-3">
                  <ClipboardList size={18} />
                  <span>Order History</span>
                </span>
              </NavLink>
            )}

            {!isStaff && (
              <NavLink to="/reviews" className={navItemClass}>
                <span className="flex items-center gap-3">
                  <Star size={18} />
                  <span>Reviews</span>
                </span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Staff & Management Section (If Staff) */}
        {(isStaff || hasPermission('roles.manage')) && (
          <div>
            <p className={navSectionClass}>Operations</p>
            <nav className="space-y-1">
              <NavLink to="/dashboard" className={navItemClass}>
                <span className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  <span>Staff Dashboard</span>
                </span>
                <span className="rounded bg-[#D4A63A]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#D4A63A] uppercase">
                  Staff
                </span>
              </NavLink>

              {hasPermission('roles.manage') && (
                <NavLink to="/admin" className={navItemClass}>
                  <span className="flex items-center gap-3">
                    <ShieldAlert size={18} />
                    <span>Admin Console</span>
                  </span>
                </NavLink>
              )}
            </nav>
          </div>
        )}

        {/* Info & Discover */}
        <div>
          <p className={navSectionClass}>Restaurant</p>
          <nav className="space-y-1">
            <NavLink to="/branches" className={navItemClass}>
              <span className="flex items-center gap-3">
                <MapPin size={18} />
                <span>Branches</span>
              </span>
            </NavLink>

            <NavLink to="/about" className={navItemClass}>
              <span className="flex items-center gap-3">
                <Info size={18} />
                <span>About Us</span>
              </span>
            </NavLink>

            <NavLink to="/contact" className={navItemClass}>
              <span className="flex items-center gap-3">
                <PhoneCall size={18} />
                <span>Contact</span>
              </span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* User Card & Sign Out at Bottom */}
      <div className="p-3.5 border-t border-white/10 bg-[#080808]/60">
        <div className="flex items-center justify-between gap-2 rounded-xl p-2 bg-white/5 border border-white/5">
          <Link to="/profile" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4A63A] text-black font-extrabold text-base shadow-inner">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-[#D4A63A] font-medium truncate flex items-center gap-1">
                <span>{roleLabel}</span>
                <ChevronRight size={12} className="opacity-60" />
              </p>
            </div>
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 w-64 xl:w-72 flex-col bg-[#0d0c0b] border-r border-[#D4A63A]/20 z-40 shadow-2xl">
        {navContent}
      </aside>

      {/* 2. Mobile Top Bar (Only visible on screens < lg) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0d0c0b]/95 backdrop-blur-xl border-b border-[#D4A63A]/20">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl border border-white/10 text-neutral-300 hover:text-[#D4A63A] hover:border-[#D4A63A]/40"
          aria-label="Open navigation sidebar"
        >
          <MenuIcon size={22} />
        </button>

        <Brand to="/" compact showText tone="dark" />

        <div className="flex items-center gap-2">
          {canOrder && (
            <Link
              to="/order"
              className="relative p-2 text-neutral-300 hover:text-[#D4A63A]"
              aria-label="Cart"
            >
              <ShoppingBag size={21} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4A63A] px-1 text-[10px] font-bold text-black">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          <Link
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4A63A]/20 text-[#D4A63A] font-bold text-xs"
            aria-label="Profile"
          >
            {userInitial}
          </Link>
        </div>
      </header>

      {/* 3. Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0d0c0b] border-r border-[#D4A63A]/30 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  )
}
