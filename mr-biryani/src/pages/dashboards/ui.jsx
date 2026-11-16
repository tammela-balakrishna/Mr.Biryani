import { Link } from 'react-router-dom'
import { card, ghost } from './shared'

// Layout pieces shared by the role dashboards.

export function Message({ text, tone = 'error' }) {
  if (!text) return null
  const colours = tone === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${colours}`}>{text}</p>
}

export function Shell({ eyebrow, title, links = [], children }) {
  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold">{title}</h1>
          </div>
          {links.length > 0 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Quick links">
              {links.map(([label, to]) => <Link key={to} to={to} className={ghost}>{label}</Link>)}
            </nav>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  )
}

export function Kpis({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className={card}>
          <p className="text-xs uppercase tracking-wider text-neutral-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[#D4A63A]">{value}</p>
        </div>
      ))}
    </div>
  )
}

export function Section({ title, children, className = '' }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function Empty({ children }) {
  return <p className="text-neutral-400">{children}</p>
}
