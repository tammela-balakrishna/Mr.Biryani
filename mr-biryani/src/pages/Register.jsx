import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { ArrowLeft, CheckCircle2, KeyRound, Phone, UserRound, UserPlus } from 'lucide-react'
import { findMockUserByPhone, isValidIndianPhone, MOCK_OTP, normalizePhone, registerMockUser, verifyMockOtp } from '../utils/mockAuth'

function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('details')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: name === 'phone' ? normalizePhone(value) : value }))
    setError('')
    setMessage('')
  }

  const handleSendOtp = (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (form.name.trim().length < 3) {
      setError('Enter your full name (at least 3 characters).')
      return
    }
    if (!isValidIndianPhone(form.phone)) {
      setError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    if (findMockUserByPhone(form.phone)) {
      setError('This mobile number is already registered. Please log in.')
      return
    }
    setStep('otp')
    setMessage('Demo OTP sent to +91 ' + normalizePhone(form.phone) + '.')
  }

  const handleVerifyOtp = (event) => {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit OTP.')
      return
    }
    if (!verifyMockOtp(otp)) {
      setError('Incorrect OTP. Use the demo OTP shown below.')
      return
    }
    try {
      registerMockUser(form)
      navigate('/')
    } catch (registrationError) {
      setError(registrationError.message)
      setStep('details')
    }
  }

  const inputClass = 'w-full bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600'

  return (
    <main className="relative isolate flex min-h-[75vh] items-center justify-center overflow-hidden bg-[#080808] px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-[#321010] opacity-40 blur-[100px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#D4A63A] opacity-[0.07] blur-[100px]" />
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D4A63A]/25 bg-[#111010] shadow-2xl shadow-black/50">
        <div className="h-1.5 bg-gradient-to-r from-[#321010] via-[#D4A63A] to-[#321010]" />
        <div className="p-6 sm:p-10">
          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center"><Brand to="/" showText={false} tone="dark" className="mx-auto" /></div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[3px] text-[#D4A63A]">House of Andhra Flavours</p>
            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Create <span className="text-[#D4A63A]">Account</span></h1>
            <p className="mt-3 text-sm text-neutral-400">Register with your mobile number. No password required.</p>
          </div>

          {message && <div role="status" className="mb-5 rounded-xl border border-[#D4A63A]/30 bg-[#321010] p-4 text-sm leading-6 text-[#E8BD57]">{message}</div>}
          {error && <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

          {step === 'details' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-neutral-200">Full Name</label>
                <div className="flex items-center rounded-lg border border-white/10 bg-[#080808] px-4 transition focus-within:border-[#D4A63A]">
                  <UserRound size={18} className="shrink-0 text-neutral-500" />
                  <input id="register-name" name="name" type="text" autoComplete="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="register-phone" className="mb-2 block text-sm font-semibold text-neutral-200">Mobile Number</label>
                <div className="flex items-center rounded-lg border border-white/10 bg-[#080808] px-4 transition focus-within:border-[#D4A63A]">
                  <Phone size={18} className="shrink-0 text-neutral-500" />
                  <span className="ml-3 border-r border-white/10 pr-3 text-sm text-neutral-400">+91</span>
                  <input id="register-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" className={inputClass} />
                </div>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#E8BD57]">Send Verification OTP <UserPlus size={18} /></button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="register-otp" className="mb-2 block text-sm font-semibold text-neutral-200">Enter 6-digit OTP</label>
                <div className="flex items-center rounded-lg border border-white/10 bg-[#080808] px-4 transition focus-within:border-[#D4A63A]">
                  <KeyRound size={18} className="shrink-0 text-neutral-500" />
                  <input id="register-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP" className={inputClass + ' text-center tracking-[0.5em]'} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Verifying +91 {normalizePhone(form.phone)}</p>
              </div>
              <div className="rounded-lg border border-[#D4A63A]/25 bg-[#D4A63A]/5 p-3 text-sm text-[#E8BD57]">Demo mode: use <strong className="tracking-widest">{MOCK_OTP}</strong>. No SMS is sent.</div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D4A63A] py-3.5 font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#E8BD57]">Verify OTP & Create Account <CheckCircle2 size={18} /></button>
              <button type="button" onClick={() => { setStep('details'); setOtp(''); setError(''); setMessage('') }} className="w-full text-sm text-neutral-400 transition hover:text-[#D4A63A]">Change name or mobile number</button>
            </form>
          )}

          <p className="mt-7 text-center text-sm text-neutral-400">Already registered? <Link to="/login" className="font-bold text-[#D4A63A] transition hover:text-[#E8BD57]">Login with OTP</Link></p>
          <Link to="/" className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-500 transition hover:text-[#D4A63A]"><ArrowLeft size={14} /> Back to Home</Link>
        </div>
      </section>
    </main>
  )
}

export default Register
