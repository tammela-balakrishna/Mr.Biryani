import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu as MenuIcon, X, ShoppingBag, UserRound, LogOut } from 'lucide-react'
import Brand from './Brand'
import Button from './Button'
import { useAuth } from '../auth/AuthContext'
import { getCart } from '../utils/cart'

const navLinks = [['Home', '/'], ['Menu', '/menu'], ['About', '/about'], ['Gallery', '/gallery'], ['Branches', '/branches'], ['Contact', '/contact'], ['Reviews', '/reviews'], ['Reserve a Table', '/reservations']]

function Navbar() {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(() => getCart().reduce((n, x) => n + x.quantity, 0))
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { status, user, hasPermission, isStaff, logout } = useAuth()

  useEffect(() => {
    const refresh = () => {
      setCount(getCart().reduce((n, x) => n + x.quantity, 0))
      setScrolled(window.scrollY > 12)
    }
    refresh()
    window.addEventListener('scroll', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('scroll', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [location.pathname])

  const signOut = async () => {
    setOpen(false)
    await logout()
  }

  const isAuthed = status === 'authenticated'
  const firstName = user?.fullName?.split(' ')[0]

  const accountLinks = (
    <>
      {isStaff && <Link to="/staff" className="text-sm font-semibold text-[#D4A63A]">Staff</Link>}
      {hasPermission('roles.manage') && <Link to="/admin" className="text-sm font-semibold text-[#D4A63A]">Admin</Link>}
      {isAuthed ? (
        <>
          <Link to="/profile" className="flex items-center gap-2 text-sm text-neutral-300 hover:text-[#D4A63A]"><UserRound size={17} />{firstName}</Link>
          <button onClick={signOut} aria-label="Sign out" className="p-2 text-neutral-400 hover:text-red-300"><LogOut size={17} /></button>
        </>
      ) : (
        <Link to="/login" className="flex items-center gap-2 text-sm text-neutral-300 hover:text-[#D4A63A]"><UserRound size={17} />Login</Link>
      )}
    </>
  )

  return (
    <header className={'sticky top-0 z-50 border-b border-[#D4A63A]/20 bg-[#080808]/95 backdrop-blur-xl ' + (scrolled ? 'shadow-lg shadow-black/40' : '')}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Main navigation">
        <Brand to="/" compact={scrolled} showText tone="dark" className="shrink-0" />
        <div className="hidden items-center gap-5 xl:flex">
          {navLinks.map(([name, path]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => 'text-sm font-semibold transition ' + (isActive ? 'text-[#D4A63A]' : 'text-neutral-300 hover:text-[#D4A63A]')}>{name}</NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/order" aria-label={'Cart with ' + count + ' items'} className="relative p-2 text-neutral-300 hover:text-[#D4A63A]">
            <ShoppingBag size={21} />
            {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#D4A63A] px-1.5 text-xs font-bold text-black">{count}</span>}
          </Link>
          {isStaff && <span className="text-xs font-semibold uppercase tracking-wider text-[#D4A63A]">Staff</span>}
          {accountLinks}
          <Button to="/menu" variant="spice" size="sm">Order Now</Button>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg border border-[#D4A63A]/40 p-2 text-[#D4A63A] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
          {open ? <X size={24} /> : <MenuIcon size={24} />}
        </button>
      </nav>
      <div className={'grid overflow-hidden bg-[#101010] transition-all lg:hidden ' + (open ? 'grid-rows-[1fr] border-t border-white/10' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 px-5 py-5">
            {navLinks.map(([name, path]) => (
              <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => 'rounded-lg px-4 py-3 text-sm font-semibold ' + (isActive ? 'bg-[#321010] text-[#D4A63A]' : 'text-neutral-300')}>{name}</NavLink>
            ))}
            <Link to="/order" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-neutral-300"><ShoppingBag size={17} />Cart ({count})</Link>
            {hasPermission('roles.manage') && <Link to="/admin" onClick={() => setOpen(false)} className="px-4 py-3 text-sm text-[#D4A63A]">Admin dashboard</Link>}
            {isAuthed ? (
              <>
                <Link to="/profile" onClick={() => setOpen(false)} className="px-4 py-3 text-sm text-neutral-300">My account · {user.fullName}</Link>
                <button onClick={signOut} className="px-4 py-3 text-left text-sm text-red-300">Sign out</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="px-4 py-3 text-sm text-neutral-300">Login / Register</Link>
            )}
            <Button to="/menu" variant="spice" fullWidth onClick={() => setOpen(false)}>Order Now</Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
