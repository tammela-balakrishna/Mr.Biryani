
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react'

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))

    setMessage('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!form.email.trim()) {
      newErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!form.password) {
      newErrors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must contain at least 8 characters.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setMessage(
      'Your details are valid. Connect an authentication backend to sign in.',
    )
  }

  const inputClass =
    'w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600'

  return (
    <main className="relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-[#080808] px-4 py-16 text-white sm:px-6 sm:py-20">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-[#321010] opacity-40 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#D4A63A] opacity-[0.07] blur-[100px]" />

      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4A63A]/25 bg-[#111010] shadow-2xl shadow-black/50">
        {/* Top Brand Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#321010] via-[#D4A63A] to-[#321010]" />

        <div className="p-6 sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
<div className="flex justify-center">
  <Brand
    to="/"
    showText={false}
    tone="dark"
    className="shrink-0"
  />
</div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[3px] text-[#D4A63A]">
              House of Andhra Flavours
            </p>

            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
              Welcome <span className="text-[#D4A63A]">Back</span>
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              Sign in to your Mr. Biriyani account.
            </p>
          </div>

          {/* Status Message */}
          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-[#D4A63A]/30 bg-[#321010] p-4 text-sm leading-6 text-[#E8BD57]"
            >
              {message}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-neutral-200"
              >
                Email Address
              </label>

              <div
                className={`flex items-center rounded-lg border bg-[#080808] px-4 transition focus-within:border-[#D4A63A] ${
                  errors.email ? 'border-red-500' : 'border-white/10'
                }`}
              >
                <Mail size={18} className="shrink-0 text-neutral-500" />

                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              {errors.email && (
                <p className="mt-2 text-xs text-red-400" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-neutral-200"
              >
                Password
              </label>

              <div
                className={`flex items-center rounded-lg border bg-[#080808] px-4 transition focus-within:border-[#D4A63A] ${
                  errors.password ? 'border-red-500' : 'border-white/10'
                }`}
              >
                <LockKeyhole size={18} className="shrink-0 text-neutral-500" />

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="shrink-0 text-neutral-500 transition hover:text-[#D4A63A]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {errors.password && (
                <p className="mt-2 text-xs text-red-400" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-[#E8BD57] hover:shadow-lg hover:shadow-[#D4A63A]/20"
            >
              Login
              <ShieldCheck size={18} />
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-7 text-center text-sm text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-[#D4A63A] transition hover:text-[#E8BD57]"
            >
              Create Account
            </Link>
          </p>

          {/* Back Home */}
          <Link
            to="/"
            className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 transition hover:text-[#D4A63A]"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Login
