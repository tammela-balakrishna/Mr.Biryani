
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  UserRound,
  Mail,
  LockKeyhole,
  Phone,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

function Register() {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const passwordChecks = [
    {
      label: 'At least 8 characters',
      valid: form.password.length >= 8,
    },
    {
      label: 'One uppercase letter',
      valid: /[A-Z]/.test(form.password),
    },
    {
      label: 'One lowercase letter',
      valid: /[a-z]/.test(form.password),
    },
    {
      label: 'One number',
      valid: /[0-9]/.test(form.password),
    },
    {
      label: 'One special character',
      valid: /[^A-Za-z0-9]/.test(form.password),
    },
  ]

  const strength = passwordChecks.filter((check) => check.valid).length

  const strengthLabel =
    strength <= 2
      ? 'Weak'
      : strength <= 4
        ? 'Medium'
        : 'Strong'

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
      ...(name === 'password' ? { confirmPassword: '' } : {}),
    }))

    setMessage('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!form.name.trim()) {
      newErrors.name = 'Full name is required.'
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Name must contain at least 3 characters.'
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number.'
    }

    if (strength < 5) {
      newErrors.password =
        'Use 8 characters with uppercase, lowercase, number and special character.'
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setMessage(
      'Your details are valid. Connect an authentication backend to create your account.',
    )
  }

  const inputClass =
    'w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600'

  const fields = [
    {
      id: 'register-name',
      label: 'Full Name',
      name: 'name',
      type: 'text',
      placeholder: 'Enter your full name',
      icon: UserRound,
      autoComplete: 'name',
    },
    {
      id: 'register-email',
      label: 'Email Address',
      name: 'email',
      type: 'email',
      placeholder: 'Enter your email',
      icon: Mail,
      autoComplete: 'email',
    },
    {
      id: 'register-phone',
      label: 'Phone Number',
      name: 'phone',
      type: 'tel',
      placeholder: '10-digit mobile number',
      icon: Phone,
      autoComplete: 'tel',
    },
  ]

  return (
    <main className="relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-[#080808] px-4 py-16 text-white sm:px-6 sm:py-20">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-[#321010] opacity-40 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#D4A63A] opacity-[0.07] blur-[100px]" />

      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D4A63A]/25 bg-[#111010] shadow-2xl shadow-black/50">
        {/* Top Brand Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#321010] via-[#D4A63A] to-[#321010]" />

        <div className="p-6 sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
<div className="mb-5 flex justify-center">
  <Brand
    to="/"
    showText={false}
    tone="dark"
    className="mx-auto"
  />
</div>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[3px] text-[#D4A63A]">
              House of Andhra Flavours
            </p>

            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
              Create <span className="text-[#D4A63A]">Account</span>
            </h1>

            <p className="mt-3 text-sm text-neutral-400">
              Join the Mr. Biriyani family.
            </p>
          </div>

          {/* Status */}
          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-[#D4A63A]/30 bg-[#321010] p-4 text-sm leading-6 text-[#E8BD57]"
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Basic Details */}
            {fields.map((field) => {
              const Icon = field.icon

              return (
                <div key={field.name}>
                  <label
                    htmlFor={field.id}
                    className="mb-2 block text-sm font-semibold text-neutral-200"
                  >
                    {field.label}
                  </label>

                  <div
                    className={`flex items-center rounded-lg border bg-[#080808] px-4 transition focus-within:border-[#D4A63A] ${
                      errors[field.name]
                        ? 'border-red-500'
                        : 'border-white/10'
                    }`}
                  >
                    <Icon size={18} className="shrink-0 text-neutral-500" />

                    <input
                      id={field.id}
                      type={field.type}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      className={inputClass}
                    />
                  </div>

                  {errors[field.name] && (
                    <p className="mt-2 text-xs text-red-400" role="alert">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Password */}
            <div>
              <label
                htmlFor="register-password"
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
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

              {/* Password Strength */}
              {form.password && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">
                      Password strength
                    </span>

                    <span
                      className={`text-xs font-bold ${
                        strength <= 2
                          ? 'text-red-400'
                          : strength <= 4
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}
                    >
                      {strengthLabel}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full ${
                          strength >= level
                            ? strength <= 2
                              ? 'bg-red-500'
                              : strength <= 4
                                ? 'bg-yellow-400'
                                : 'bg-green-500'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {passwordChecks.map((check) => (
                      <p
                        key={check.label}
                        className={`flex items-center gap-1.5 text-[10px] ${
                          check.valid ? 'text-green-400' : 'text-neutral-500'
                        }`}
                      >
                        <CheckCircle2 size={12} />
                        {check.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-2 text-xs leading-5 text-red-400" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-2 block text-sm font-semibold text-neutral-200"
              >
                Confirm Password
              </label>

              <div
                className={`flex items-center rounded-lg border bg-[#080808] px-4 transition focus-within:border-[#D4A63A] ${
                  errors.confirmPassword
                    ? 'border-red-500'
                    : 'border-white/10'
                }`}
              >
                <LockKeyhole size={18} className="shrink-0 text-neutral-500" />

                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirmation password'
                      : 'Show confirmation password'
                  }
                  aria-pressed={showConfirmPassword}
                  className="shrink-0 text-neutral-500 transition hover:text-[#D4A63A]"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="mt-2 text-xs text-red-400" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-[#E8BD57] hover:shadow-lg hover:shadow-[#D4A63A]/20"
            >
              Create Account
              <ShieldCheck size={18} />
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-7 text-center text-sm text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-[#D4A63A] transition hover:text-[#E8BD57]"
            >
              Login Now
            </Link>
          </p>

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

export default Register
