import { useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'

/* ---------- CUSTOM SOCIAL ICONS ---------- */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
    <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
  </svg>
)

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M17.05 13.91c-.02-3.1 2.54-4.58 2.65-4.65-1.44-2.1-3.66-2.39-4.46-2.42-1.89-.19-3.7 1.11-4.66 1.11-.96 0-2.46-1.08-4.04-1.05-2.04.03-3.92 1.19-4.97 3.01-2.13 3.68-.54 9.13 1.53 12.11 1.02 1.48 2.2 3.12 3.8 3.06 1.53-.06 2.12-.99 3.97-.99 1.83 0 2.37.99 3.97.96 1.64-.03 2.66-1.5 3.65-2.95 1.14-1.66 1.61-3.28 1.63-3.36-.03-.02-3.04-1.16-3.07-4.83zM14.95 4.39c.84-1.01 1.41-2.42 1.25-3.83-1.2.05-2.67.8-3.53 1.81-.76.88-1.43 2.32-1.24 3.71 1.34.1 2.68-.68 3.52-1.69z"/>
  </svg>
)

/* ---------- PAGE ---------- */
const IMG = {
  bg: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=80',
}

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function Register() {
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
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
    if (!form.password) {
      newErrors.password = 'Password is required'
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
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
    setMessage('Your details are valid. Connect an authentication backend to create your account.')
  }

  const inputClass = 'w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-400 font-sans font-medium'

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16"
      style={{
        backgroundImage: `url('${IMG.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-[#050200]/85 z-0" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Montserrat', sans-serif; }
      `}</style>

      <section className="relative z-10 w-full max-w-[420px] rounded-2xl border border-[#FFC107]/40 bg-[#0a0a0a]/95 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <div className="p-8 sm:p-10">
          
          {/* Logo & Header */}
          <div className="mb-8 text-center font-display">
            <div className="flex justify-center">
              <Brand to="/" showText={false} tone="dark" className="shrink-0" />
            </div>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[2px] text-white">
              House of Andhra Flavours
            </p>

            <h1 className="mt-8 text-2xl font-bold text-white tracking-wide">
              Create Your Account
            </h1>
            <p className="mt-2 text-xs font-medium text-neutral-400">
              Join us for an authentic dining experience
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-lg border border-green-500/30 bg-green-900/20 p-3 text-xs text-green-400 text-center">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 font-display">
            {/* Full Name */}
            <div>
              <div className={`flex items-center rounded-lg border bg-[#1a1a1a] px-4 transition ${errors.name ? 'border-red-500' : 'border-neutral-800 focus-within:border-[#FFC107]'}`}>
                <UserRound size={18} className="shrink-0 text-white" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div>
              <div className={`flex items-center rounded-lg border bg-[#1a1a1a] px-4 transition ${errors.email ? 'border-red-500' : 'border-neutral-800 focus-within:border-[#FFC107]'}`}>
                <Mail size={18} className="shrink-0 text-white" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <div className={`flex items-center rounded-lg border bg-[#1a1a1a] px-4 transition ${errors.password ? 'border-red-500' : 'border-neutral-800 focus-within:border-[#FFC107]'}`}>
                <LockKeyhole size={18} className="shrink-0 text-white" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  autoComplete="new-password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="shrink-0 text-white transition hover:text-[#FFC107]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <div className={`flex items-center rounded-lg border bg-[#1a1a1a] px-4 transition ${errors.confirmPassword ? 'border-red-500' : 'border-neutral-800 focus-within:border-[#FFC107]'}`}>
                <LockKeyhole size={18} className="shrink-0 text-white" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="shrink-0 text-white transition hover:text-[#FFC107]"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFC107] py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 shadow-lg"
            >
              Register <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center justify-center gap-3 font-display">
            <div className="h-px w-full bg-neutral-700"></div>
            <span className="shrink-0 text-[11px] font-medium text-neutral-400">or sign up with</span>
            <div className="h-px w-full bg-neutral-700"></div>
          </div>

          {/* Social Logins */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-transform hover:scale-110 shadow-lg">
              <GoogleIcon />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] transition-transform hover:scale-110 shadow-lg">
              <FacebookIcon />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black border border-white/20 transition-transform hover:scale-110 shadow-lg">
              <AppleIcon />
            </button>
          </div>

          {/* Login Link */}
          <p className="mt-8 text-center text-xs font-medium text-white font-display">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#FFC107] hover:underline">
              Login here
            </Link>
          </p>
          
        </div>
      </section>
    </main>
  )
}

export default Register