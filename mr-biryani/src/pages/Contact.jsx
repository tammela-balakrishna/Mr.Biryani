import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  UtensilsCrossed,
} from 'lucide-react'
import { MotionStyles, Reveal } from '../components/Motion'

/* TODO: replace the "to be added" text with the real phone, email and hours. */
const contactDetails = [
  {
    icon: MapPin,
    title: 'Our Location',
    description: 'BTM 1st Stage / Madiwala, Bengaluru, Karnataka, India.',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    icon: Phone,
    title: 'Phone Number',
    description: 'Restaurant phone number to be added.',
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    icon: Mail,
    title: 'Email Address',
    description: 'Restaurant email address to be added.',
    gradient: 'from-sky-400 to-blue-600',
  },
  {
    icon: Clock,
    title: 'Opening Hours',
    description: 'Please contact the restaurant for current opening hours.',
    gradient: 'from-fuchsia-500 to-purple-600',
  },
]

const initialForm = { name: '', email: '', phone: '', subject: '', message: '' }

function Contact() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (submitted) setSubmitted(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    // Demo only: connect an API or email service to deliver messages.
    setSubmitted(true)
    setForm(initialForm)
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#080808] px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none transition duration-300 focus:-translate-y-0.5 focus:border-[#D4A63A] focus:ring-2 focus:ring-[#D4A63A]/20'

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <MotionStyles />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 py-20 sm:py-28">
        <div
          className="kenburns absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=85')",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-black/80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/50 to-[#321010]/60" />
        <div className="floaty absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-orange-500/20 blur-[100px]" />
        <div
          className="floaty absolute -left-16 bottom-0 -z-10 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-[100px]"
          style={{ animationDelay: '-3s' }}
        />

        <div className="mx-auto max-w-7xl text-center">
          <div className="rise-in mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/40 bg-[#080808]/90 px-5 py-2.5">
            <UtensilsCrossed size={16} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
              Get in Touch
            </span>
          </div>

          <h1
            className="rise-in font-serif text-5xl font-bold sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '.15s' }}
          >
            Contact <span className="text-shimmer">Us</span>
          </h1>

          <p
            className="rise-in mx-auto mt-5 max-w-2xl text-sm leading-8 text-neutral-200 sm:text-lg"
            style={{ animationDelay: '.3s' }}
          >
            Have a question, feedback, or need assistance? We'd love to hear
            from you. Connect with the Mr. Biriyani team.
          </p>

          <nav
            aria-label="Breadcrumb"
            className="rise-in mt-8 flex items-center justify-center gap-3 text-sm"
            style={{ animationDelay: '.45s' }}
          >
            <Link to="/" className="text-neutral-400 transition hover:text-[#D4A63A]">
              Home
            </Link>
            <span className="text-[#D4A63A]">/</span>
            <span className="font-semibold text-[#D4A63A]">Contact</span>
          </nav>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500" />
      </section>

      {/* Contact Information and Form */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* Left */}
        <div>
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
              Let's Connect
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
              We're Here to
              <span className="text-shimmer block">Help You</span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-8 text-neutral-400 sm:text-base">
              Whether you have questions about our menu, restaurant, or
              orders, feel free to get in touch with us.
            </p>
          </Reveal>

          <div className="mt-9 space-y-6">
            {contactDetails.map(({ icon: Icon, title, description, gradient }, i) => (
              <Reveal key={title} delay={i * 100}>
                <div className="group flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg transition duration-500 group-hover:-rotate-6 group-hover:scale-110`}
                  >
                    <Icon size={21} className="text-white" />
                  </div>

                  <div className="pt-1">
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-neutral-400">
                      {description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <div className="relative overflow-hidden rounded-2xl border border-[#D4A63A]/20 bg-gradient-to-br from-[#321010] to-[#2a0b2a] p-6 sm:p-8">
              <div className="floaty absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-400/20 blur-3xl" />

              <div className="relative">
                <MessageCircle size={27} className="text-orange-400" />
                <h3 className="mt-4 font-serif text-xl font-bold">
                  We'd Love Your Feedback
                </h3>
                <p className="mt-2 text-sm leading-7 text-neutral-300">
                  Your feedback helps us improve the food and experience we
                  offer.
                </p>
                <Link
                  to="/menu"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#D4A63A] transition-all hover:gap-4 hover:text-[#E8BD57]"
                >
                  Explore Our Menu
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right: Form */}
        <Reveal delay={150}>
          <div
            id="contact-form"
            className="relative rounded-2xl border border-white/10 bg-[#111010] p-5 shadow-2xl shadow-black/30 sm:p-8 lg:p-10"
          >
            <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500" />

            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
                Send an Enquiry
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold">
                Send Us a <span className="text-shimmer">Message</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">
                Fill in the details below. All fields except phone number are
                required.
              </p>
            </div>

            {submitted && (
              <div
                role="status"
                className="pop-in mb-6 flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-950/40 p-4"
              >
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-400" />
                <div>
                  <p className="text-sm font-bold text-green-400">
                    Form submitted successfully
                  </p>
                  <p className="mt-1 text-xs leading-5 text-neutral-300">
                    This is a frontend demo. Your message has not been
                    delivered to the restaurant.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold">
                    Your Name <span className="text-[#D4A63A]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold">
                    Email Address <span className="text-[#D4A63A]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-phone" className="mb-2 block text-sm font-semibold">
                  Phone Number
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number (optional)"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="mb-2 block text-sm font-semibold">
                  Subject <span className="text-[#D4A63A]">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What is your enquiry about?"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold">
                  Your Message <span className="text-[#D4A63A]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Write your message here..."
                  required
                  className={`${inputClass} min-h-36 resize-y`}
                />
              </div>

              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-[#D4A63A] via-orange-400 to-[#D4A63A] px-6 py-4 text-sm font-extrabold text-black transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-500/30 active:translate-y-0"
              >
                Send Message
                <Send size={17} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>

              <p className="text-center text-xs leading-5 text-neutral-500">
                This form is currently a frontend demo. Connect an email
                service or backend API to receive messages.
              </p>
            </form>
          </div>
        </Reveal>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/10 bg-[#111010] px-5 py-14 text-center sm:py-16">
        <Reveal className="mx-auto max-w-2xl">
          <UtensilsCrossed size={30} className="floaty mx-auto text-orange-400" />
          <h2 className="mt-5 font-serif text-2xl font-bold sm:text-3xl">
            Experience the Taste of Andhra
          </h2>
          <p className="mt-3 text-sm leading-7 text-neutral-400">
            Discover our biryanis, family packs and delicious starters.
          </p>
          <Link
            to="/menu"
            className="mt-7 inline-flex items-center gap-3 rounded-lg bg-[#D4A63A] px-7 py-3.5 text-sm font-bold text-black transition hover:-translate-y-1 hover:bg-[#E8BD57]"
          >
            Explore Menu
            <ArrowRight size={17} />
          </Link>
        </Reveal>
      </section>
    </main>
  )
}

export default Contact
