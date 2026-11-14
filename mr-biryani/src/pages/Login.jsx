import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { ArrowLeft, LogIn } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401
        ? 'Invalid email or password.'
        : err.message || 'Could not sign in. Please try again.')
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
            <h1 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">Welcome <span className="text-[#D4A63A]">Back</span></h1>
            <p className="mt-3 text-sm text-neutral-400">Sign in with your email and password.</p>
          </div>

          {error && <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-neutral-200">Email</label>
              <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-neutral-200">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition hover:bg-[#E8BD57] disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'} <LogIn size={18} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-neutral-400">New here? <Link to="/register" className="font-bold text-[#D4A63A] transition hover:text-[#E8BD57]">Create an account</Link></p>
          <Link to="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 transition hover:text-[#D4A63A]"><ArrowLeft size={14} /> Back to Home</Link>
        </div>
      </section>
    </main>
  )
}

export default Login
