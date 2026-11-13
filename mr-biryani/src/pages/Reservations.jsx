import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Clock3, Users, CheckCircle2 } from 'lucide-react'
import { getMockSession } from '../utils/mockAuth'
import { createMockReservation } from '../utils/mockOrders'

const field = 'w-full rounded-xl border border-white/10 bg-[#080808] px-4 py-3 text-white outline-none transition focus:border-[#D4A63A]'

function Reservations() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ date: '', time: '19:00', guests: '2', occasion: '', notes: '' })
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState('')
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    const user = getMockSession()
    if (!user) { navigate('/login', { state: { from: '/reservations' } }); return }
    if (form.date < new Date().toISOString().slice(0, 10)) { setError('Choose today or a future date.'); return }
    setError('')
    setSaved(createMockReservation({ ...form, userId: user.id, customerName: user.name, phone: user.phone }))
  }

  return <main className="min-h-screen bg-[#080808] px-4 py-16 text-white sm:px-6">
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
      <section>
        <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">A table is waiting</p>
        <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Reserve Your <span className="text-[#D4A63A]">Table</span></h1>
        <p className="mt-5 max-w-lg leading-8 text-neutral-400">Plan your next meal at Mr. BIRIYANI. Send a reservation request and keep track of it from your account.</p>
        <div className="mt-8 space-y-4 text-sm text-neutral-300">
          <p className="flex items-center gap-3"><CalendarDays className="text-[#D4A63A]" /> Select your preferred date</p>
          <p className="flex items-center gap-3"><Clock3 className="text-[#D4A63A]" /> Choose a convenient time</p>
          <p className="flex items-center gap-3"><Users className="text-[#D4A63A]" /> Tell us how many guests to expect</p>
        </div>
        <Link to="/profile" className="mt-8 inline-block text-sm font-semibold text-[#D4A63A] hover:text-[#E8BD57]">View my reservations →</Link>
      </section>
      <section className="rounded-2xl border border-[#D4A63A]/20 bg-[#111010] p-6 sm:p-9">
        {saved ? <div className="py-10 text-center"><CheckCircle2 size={48} className="mx-auto text-[#D4A63A]" /><h2 className="mt-5 font-serif text-2xl font-bold">Request received</h2><p className="mt-3 text-sm leading-6 text-neutral-400">Your demo reservation reference is <strong className="text-white">{saved.id.slice(0, 8).toUpperCase()}</strong>. This is a local demo; the restaurant has not been notified.</p><button onClick={() => { setSaved(null); setForm({ date: '', time: '19:00', guests: '2', occasion: '', notes: '' }) }} className="mt-7 rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">Make another request</button></div> :
        <form onSubmit={submit} className="space-y-5">
          <h2 className="font-serif text-2xl font-bold">Reservation details</h2>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-neutral-300">Date<input required type="date" name="date" min={new Date().toISOString().slice(0,10)} value={form.date} onChange={change} className={field+' mt-2 [color-scheme:dark]'} /></label><label className="text-sm text-neutral-300">Time<select name="time" value={form.time} onChange={change} className={field+' mt-2'}>{['12:00','13:00','14:00','18:00','19:00','20:00','21:00'].map((time) => <option key={time}>{time}</option>)}</select></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-neutral-300">Guests<select name="guests" value={form.guests} onChange={change} className={field+' mt-2'}>{Array.from({length:12},(_,i)=>String(i+1)).map((n)=><option key={n}>{n}</option>)}</select></label><label className="text-sm text-neutral-300">Occasion<input name="occasion" value={form.occasion} onChange={change} placeholder="Birthday, family dinner..." className={field+' mt-2'} /></label></div>
          <label className="block text-sm text-neutral-300">Special requests<textarea name="notes" rows={3} value={form.notes} onChange={change} placeholder="Accessibility, seating preferences..." className={field+' mt-2'} /></label>
          <button className="w-full rounded-xl bg-[#D4A63A] px-5 py-4 font-bold text-black transition hover:bg-[#E8BD57]">Request reservation</button>
          <p className="text-xs leading-5 text-neutral-500">Demo only: this request is saved in this browser and is not sent to the restaurant. Final availability must be confirmed by staff.</p>
        </form>}
      </section>
    </div>
  </main>
}
export default Reservations
