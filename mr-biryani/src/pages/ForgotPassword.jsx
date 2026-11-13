
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react'

import Brand from '../components/Brand'
import { resetPassword } from '../utils/auth'

function ForgotPassword() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrorMessage('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setErrorMessage('')

    const email = form.email.trim().toLowerCase()
    const password = form.password
    const confirmPassword = form.confirmPassword

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please complete all fields.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    try {
      resetPassword(email, password)
      setSuccess(true)
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to reset your password. Please try again.'
      )
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080604] px-5 py-12 text-white">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=85')",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-[#160c06]/95 to-black/90" />

      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#D4A63A]/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-red-900/15 blur-[120px]" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 w-full max-w-md">

        {/* BRAND */}
        <div className="mb-8 flex justify-center">
          <Brand
            to="/"
            compact={false}
            showText={true}
            tone="dark"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#D4A63A]/25 bg-[#120d09]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">

          {/* HEADER */}
          <div className="border-b border-white/10 bg-gradient-to-r from-[#24160b] to-[#120d09] px-7 py-8 text-center sm:px-9">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4A63A]/30 bg-[#D4A63A]/10">
              {success ? (
                <CheckCircle2 size={30} className="text-green-400" />
              ) : (
                <KeyRound size={30} className="text-[#D4A63A]" />
              )}
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
              Account Recovery
            </p>

            <h1 className="text-3xl font-black">
              {success ? (
                <>
                  Password <span className="text-[#D4A63A]">Updated!</span>
                </>
              ) : (
                <>
                  Forgot <span className="text-[#D4A63A]">Password?</span>
                </>
              )}
            </h1>

            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {success
                ? 'Your password has been successfully changed.'
                : 'Enter your registered email and create a new password.'}
            </p>
          </div>

          <div className="p-7 sm:p-9">

            {success ? (
              <div className="space-y-6 text-center">

                <div className="rounded-xl border border-green-500/25 bg-green-500/10 p-5">
                  <div className="flex items-center justify-center gap-2 font-bold text-green-400">
                    <ShieldCheck size={20} />
                    Password Reset Successful
                  </div>

                  <p className="mt-3 text-sm leading-6 text-green-200/80">
                    You can now sign in using your new password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/login', { replace: true })}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#D4A63A] px-6 py-4 font-extrabold text-black transition duration-300 hover:-translate-y-1 hover:bg-[#E8BD57]"
                >
                  Continue to Login
                  <ArrowRight size={19} />
                </button>

              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Registered Email Address
                  </label>

                  <div className="flex items-center rounded-lg border border-white/15 bg-[#0b0806] px-4 transition focus-within:border-[#D4A63A]">
                    <Mail size={18} className="shrink-0 text-[#D4A63A]" />

                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your registered email"
                      autoComplete="email"
                      required
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* NEW PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    New Password
                  </label>

                  <div className="flex items-center rounded-lg border border-white/15 bg-[#0b0806] px-4 transition focus-within:border-[#D4A63A]">
                    <LockKeyhole size={18} className="shrink-0 text-[#D4A63A]" />

                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Create a new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="text-neutral-500 transition hover:text-[#D4A63A]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-neutral-500">
                    Use at least 8 characters.
                  </p>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-neutral-300"
                  >
                    Confirm New Password
                  </label>

                  <div className="flex items-center rounded-lg border border-white/15 bg-[#0b0806] px-4 transition focus-within:border-[#D4A63A]">
                    <LockKeyhole size={18} className="shrink-0 text-[#D4A63A]" />

                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      className="w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      className="text-neutral-500 transition hover:text-[#D4A63A]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#D4A63A] px-6 py-4 font-extrabold text-black transition duration-300 hover:-translate-y-1 hover:bg-[#E8BD57]"
                >
                  Reset Password
                  <ArrowRight size={19} />
                </button>

              </form>
            )}

            {/* BACK TO LOGIN */}
            {!success && (
              <div className="mt-7 border-t border-white/10 pt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 transition hover:text-[#D4A63A]"
                >
                  <ArrowLeft size={17} />
                  Back to Login
                </Link>
              </div>
            )}

          </div>
        </div>

        <p className="mt-7 text-center text-xs leading-6 text-neutral-500">
          © {new Date().getFullYear()} Mr. BIRIYANI.
          <span className="block">House of Andhra Flavours.</span>
        </p>

      </div>
    </main>
  )
}

export default ForgotPassword
