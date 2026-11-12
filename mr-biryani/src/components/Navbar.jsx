import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Brand from './Brand'
import {
  Menu as MenuIcon,
  X,
  ShoppingBag,
  UserRound,
  ChevronRight,
  Flame,
} from 'lucide-react'

import Button from './Button'

/* Save as src/components/Navbar.jsx */

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/menu' },
  { name: 'About', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Contact', path: '/contact' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logoFailed, setLogoFailed] = useState(false)
  const location = useLocation()

  const closeMenu = () => setIsOpen(false)

  /* Scroll: solid blurred bar + page progress line */
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        setScrolled(y > 12)
        setProgress(max > 0 ? Math.min((y / max) * 100, 100) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  /* Close the mobile menu whenever the page changes */
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  /* Escape closes the menu; page does not scroll behind it */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const linkStyle = ({ isActive }) =>
    `group relative py-2 text-sm font-semibold tracking-wide transition-colors duration-300 ${
      isActive ? 'text-[#D4A63A]' : 'text-neutral-300 hover:text-[#D4A63A]'
    }`

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-[#D4A63A]/30 bg-[#080808]/85 shadow-lg shadow-black/50 backdrop-blur-xl'
          : 'border-[#D4A63A]/20 bg-[#080808]'
      }`}
    >
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          scrolled ? 'py-2' : 'py-3'
        }`}
        aria-label="Main navigation"
      >
        {/* Brand logo (a div, not h1, so each page keeps its own single h1) */}
{/* Brand Logo */}
<Brand
  to="/"
  onClick={closeMenu}
  compact={scrolled}
  showText={true}
  tone="dark"
  className="shrink-0"
/>


        {/* Desktop navigation */}
        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
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
                    className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-orange-400 via-[#D4A63A] to-fuchsia-500 transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/5 hover:text-[#D4A63A]"
          >
            <UserRound size={17} />
            Login
          </Link>

          <Link
            to="/order"
            aria-label="Shopping bag"
            className="rounded-lg p-2 text-neutral-300 transition hover:scale-110 hover:bg-white/5 hover:text-[#D4A63A]"
          >
            <ShoppingBag size={21} />
          </Link>

          <Button to="/order" variant="spice" size="sm">
            Order Now
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className="relative rounded-lg border border-[#D4A63A]/40 p-2 text-[#D4A63A] transition hover:bg-[#321010] lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          <span
            className={`block transition-transform duration-300 ${
              isOpen ? 'rotate-90' : 'rotate-0'
            }`}
          >
            {isOpen ? <X size={25} /> : <MenuIcon size={25} />}
          </span>
        </button>
      </nav>

      {/* Mobile navigation */}
      <div
        id="mobile-menu"
        className={`grid overflow-hidden bg-[#101010]/95 backdrop-blur-xl transition-all duration-500 ease-in-out lg:hidden ${
          isOpen
            ? 'grid-rows-[1fr] border-t border-[#D4A63A]/20'
            : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 px-5 py-5">
            {navLinks.map((link, i) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                onClick={closeMenu}
                tabIndex={isOpen ? 0 : -1}
                style={{ transitionDelay: isOpen ? `${i * 60}ms` : '0ms' }}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-500 ${
                    isOpen ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'
                  } ${
                    isActive
                      ? 'border-l-4 border-[#D4A63A] bg-gradient-to-r from-[#321010] to-transparent text-[#D4A63A]'
                      : 'text-neutral-300 hover:bg-[#1b1712] hover:text-[#D4A63A]'
                  }`
                }
              >
                {link.name}
                <ChevronRight size={16} />
              </NavLink>
            ))}

            <div
              style={{ transitionDelay: isOpen ? '350ms' : '0ms' }}
              className={`mt-3 flex flex-col gap-4 border-t border-white/10 pt-4 transition-all duration-500 ${
                isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <Link
                to="/login"
                onClick={closeMenu}
                tabIndex={isOpen ? 0 : -1}
                className="flex items-center gap-2 px-4 text-sm text-neutral-300 transition hover:text-[#D4A63A]"
              >
                <UserRound size={18} />
                Login / Register
              </Link>

              <Button
                to="/order"
                variant="spice"
                fullWidth
                onClick={closeMenu}
                tabIndex={isOpen ? 0 : -1}
              >
                <ShoppingBag size={17} />
                Order Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll progress line */}
      <div
        aria-hidden="true"
        className="absolute bottom-[-1px] left-0 h-0.5 bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </header>
  )
}

export default Navbar
