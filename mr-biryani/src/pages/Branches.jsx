import { Clock, MapPin, Phone, Check } from 'lucide-react'
import { BRANCHES } from '../data/branches'

export default function Branches() {
  return (
    <main className="min-h-screen bg-[#080808] px-4 py-16 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">Find us in Bengaluru</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Our <span className="text-[#D4A63A]">branches</span></h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Dine in, take away or order home delivery. Call the branch before you visit to confirm timings.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {BRANCHES.map((b) => (
            <article key={b.id} className="flex flex-col rounded-2xl border border-[#D4A63A]/20 bg-[#111010] p-6">
              <h2 className="font-serif text-2xl font-bold text-white">{b.name}</h2>
              {b.area ? <p className="mt-1 text-sm text-[#D4A63A]">{b.area}</p> : null}
              <p className="mt-2 text-sm text-neutral-400">{b.cuisine}</p>

              <ul className="mt-5 space-y-3 text-sm text-neutral-300">
                <li className="flex gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-[#D4A63A]" />
                  <span>{b.address}</span>
                </li>
                <li className="flex gap-3">
                  <Clock size={18} className="mt-0.5 shrink-0 text-[#D4A63A]" />
                  <span>{b.hours}</span>
                </li>
                {b.phone ? (
                  <li className="flex gap-3">
                    <Phone size={18} className="mt-0.5 shrink-0 text-[#D4A63A]" />
                    <a href={`tel:${b.phone}`} className="hover:text-[#E8BD57]">{b.phoneDisplay}</a>
                  </li>
                ) : null}
              </ul>

              <ul className="mt-5 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
                {b.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2">
                    <Check size={15} className="shrink-0 text-[#D4A63A]" />
                    {h}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3 pt-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.mapQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[#D4A63A]/40 px-4 py-2 text-sm font-bold text-[#D4A63A] hover:bg-[#D4A63A]/10"
                >
                  Open in Maps
                </a>
                {b.phone ? (
                  <a href={`tel:${b.phone}`} className="rounded-xl bg-[#D4A63A] px-4 py-2 text-sm font-bold text-black hover:bg-[#E8BD57]">
                    Call branch
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
