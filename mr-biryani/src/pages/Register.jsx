import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

// Public registration always creates a Customer account. There is no role selector.
function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = (e) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (form.password.length < 10) {
      setError('Password must be at least 10 characters.')
      return
    }
    const phone = form.phone.replace(/\s/g, '')
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      setError('Mobile number must include the country code, for example +919876543210.')
      return
    }
    setBusy(true)
    try {
      await register({ ...form, phone })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-white/10 bg-[#080808] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#D4A63A]'

  return (
    <main className="relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-[#080808] px-4 py-16 text-white sm:px-6 sm:py-20">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4A63A]/25 bg-[#111010] shadow-2xl shadow-black/50">
        <div className="h-1.5 bg-gradient-to-r from-[#321010] via-[#D4A63A] to-[#321010]" />
        <div className="p-6 sm:p-10">
          <div className="mb-8 text-center">
            <div className="flex justify-center"><Brand to="/" showText={false} tone="dark" className="shrink-0" /></div>
            <h1 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">Create <span className="text-[#D4A63A]">Account</span></h1>
          </div>

          {error && <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="reg-name" className="mb-2 block text-sm font-semibold text-neutral-200">Full name</label>
              <input id="reg-name" name="fullName" required minLength={2} autoComplete="name" value={form.fullName} onChange={change} className={inputClass} />
            </div>
            <div>
              <label htmlFor="reg-email" className="mb-2 block text-sm font-semibold text-neutral-200">Email</label>
              <input id="reg-email" name="email" type="email" required autoComplete="email" value={form.email} onChange={change} className={inputClass} />
            </div>
            <div>
              <label htmlFor="reg-phone" className="mb-2 block text-sm font-semibold text-neutral-200">Mobile number (optional)</label>
              <input id="reg-phone" name="phone" type="tel" autoComplete="tel" placeholder="+919876543210" value={form.phone} onChange={change} className={inputClass} />
            </div>
            <div>
              <label htmlFor="reg-password" className="mb-2 block text-sm font-semibold text-neutral-200">Password (10+ characters)</label>
              <input id="reg-password" name="password" type="password" required autoComplete="new-password" value={form.password} onChange={change} className={inputClass} />
            </div>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition hover:bg-[#E8BD57] disabled:opacity-50">
              {busy ? 'Creating account…' : 'Create account'} <UserPlus size={18} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-neutral-400">Already registered? <Link to="/login" className="font-bold text-[#D4A63A] hover:text-[#E8BD57]">Sign in</Link></p>
          <Link to="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 hover:text-[#D4A63A]"><ArrowLeft size={14} /> Back to Home</Link>
        </div>
      </section>
    </main>
  )
}

export default Register
