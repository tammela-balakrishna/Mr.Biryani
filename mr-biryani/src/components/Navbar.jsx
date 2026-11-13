
import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  Menu as MenuIcon,
  X,
  ChevronRight,
  ShoppingBag,
  UserRound,
  LogOut,
  ClipboardList,
} from 'lucide-react'

import Brand from './Brand'
import { getCurrentUser, logoutUser } from '../utils/auth'

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/menu' },
  { name: 'About', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Reviews', path: '/reviews', isHash: true },
  { name: 'Contact', path: '/contact' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())

  const location = useLocation()
  const navigate = useNavigate()

  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    setIsOpen(false)
    setCurrentUser(getCurrentUser())
  }, [location.pathname, location.hash])

  const handleLogout = () => {
    logoutUser()
    setCurrentUser(null)
    closeMenu()
    navigate('/', { replace: true })
  }

  const linkStyle = ({ isActive }) =>
    `group relative whitespace-nowrap py-2 text-xs font-semibold tracking-wide transition-colors duration-200 ${
      isActive
        ? 'text-[#FFD000]'
        : 'text-white hover:text-[#FFD000]'
    }`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#050505]">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        {/* Brand Logo */}
        <Brand
          to="/"
          onClick={closeMenu}
          compact={false}
          showText={true}
          tone="dark"
          className="shrink-0"
        />

        {/* Desktop Navigation */}
        <div className="hidden items-center justify-center gap-5 lg:flex xl:gap-7">
          {navLinks.map((link) =>
            link.isHash ? (
              <Link
                key={link.name}
                to={link.path}
                className="whitespace-nowrap py-2 text-xs font-semibold tracking-wide text-white transition-colors duration-200 hover:text-[#FFD000]"
              >
                {link.name}
              </Link>
            ) : (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                className={linkStyle}
              >
                {({ isActive }) => (
                  <>
                    {link.name}
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-[#FFD000] transition-all duration-300 ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ),
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {currentUser ? (
            <>
              <Link
                to="/order-history"
                aria-label="My Orders"
                title="My Orders"
                className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[#FFD000]"
              >
                <ClipboardList size={19} />
              </Link>

              <Link
                to="/order"
                aria-label="Shopping cart"
                title="Shopping cart"
                className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[#FFD000]"
              >
                <ShoppingBag size={20} />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                aria-label="Login"
                title="Login"
                className="rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[#FFD000]"
              >
                <UserRound size={19} />
              </Link>

              <Link
                to="/register"
                className="rounded-lg border border-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:border-[#FFD000] hover:text-[#FFD000]"
              >
                Register
              </Link>

              <Link
                to="/order"
                className="inline-flex items-center justify-center rounded-lg bg-[#FFD000] px-5 py-2.5 text-xs font-extrabold text-black shadow-md shadow-yellow-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300"
              >
                Order Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="rounded-lg border border-[#D4A63A]/40 p-2 text-[#FFD000] transition hover:bg-white/10 md:hidden"
        >
          {isOpen ? <X size={22} /> : <MenuIcon size={22} />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      <div
        id="mobile-navigation"
        className={`grid overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          isOpen
            ? 'grid-rows-[1fr] border-t border-white/10'
            : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 bg-[#080808] px-5 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5 hover:text-[#FFD000]"
              >
                {link.name}
                <ChevronRight size={16} />
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              {currentUser ? (
                <>
                  <Link
                    to="/order-history"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-3 text-sm font-semibold text-white transition hover:border-[#FFD000] hover:text-[#FFD000]"
                  >
                    <ClipboardList size={17} />
                    My Orders
                  </Link>

                  <Link
                    to="/order"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-3 text-sm font-semibold text-white transition hover:border-[#FFD000] hover:text-[#FFD000]"
                  >
                    <ShoppingBag size={17} />
                    Cart
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-3 text-sm font-semibold text-white transition hover:border-[#FFD000] hover:text-[#FFD000]"
                  >
                    <UserRound size={17} />
                    Login
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 rounded-lg border border-white/20 py-3 text-sm font-semibold text-white transition hover:border-[#FFD000] hover:text-[#FFD000]"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/20"
              >
                <LogOut size={17} />
                Logout
              </button>
            ) : (
              <Link
                to="/order"
                onClick={closeMenu}
                className="mt-2 rounded-lg bg-[#FFD000] px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Order Now
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
