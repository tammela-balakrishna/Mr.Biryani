import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { MotionStyles, Reveal } from '../components/Motion'
import { api } from '../api/client'

/* ---------- CUSTOM ICONS (Fallback for missing Lucide exports) ---------- */
const FacebookIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" strokeWidth={0}>
    <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
  </svg>
);

const InstagramIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const YoutubeIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" strokeWidth={0}>
    <path d="M21.543 6.498C22 8.28 22 12 22 12s0 3.72-.457 5.502c-.254.985-.997 1.76-1.938 2.022C17.896 20 12 20 12 20s-5.893 0-7.605-.476c-.945-.266-1.687-1.04-1.938-2.022C2 15.72 2 12 2 12s0-3.72.457-5.502c.254-.985.997-1.76 1.938-2.022C6.107 4 12 4 12 4s5.896 0 7.605.476c.945.266 1.687 1.04 1.938 2.022zM10 15.5l6-3.5-6-3.5v7z" />
  </svg>
);

/* ---------- DATA & IMAGES ---------- */
const IMG = {
  bg: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=80',
}

const initialForm = { name: '', email: '', message: '' }

export default function Contact() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (submitted) setSubmitted(false)
  }

  const [sendError, setSendError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSendError('')
    try {
      await api.post('/api/v1/enquiries', { name: form.name, email: form.email, message: form.message })
      setSubmitted(true)
      setForm(initialForm)
    } catch (err) {
      setSendError(err?.message || 'Your message could not be sent. Please try again or call the restaurant.')
    }
  }

  const inputClass =
    'w-full px-4 py-3.5 bg-white border border-gray-200 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFC107]/50 focus:border-[#FFC107] transition-all font-sans text-sm'

  return (
    <main
      className="min-h-screen relative py-12 px-6"
      style={{
        backgroundImage: `url('${IMG.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <MotionStyles />

      {/* Global dark overlay to match the image's dark ambiance */}
      <div className="absolute inset-0 bg-[#0a0500]/85 z-0"></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Montserrat', sans-serif; }
        .bg-instagram {
          background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%);
        }
      `}</style>

      <div className="relative z-10 max-w-5xl mx-auto font-display pt-8">
        
        {/* HEADER */}
        <Reveal>
          <div className="flex flex-col items-center justify-center mb-12">
            <h1 className="font-bold text-[#FFC107] text-4xl tracking-wide drop-shadow-md">
              Contact Us
            </h1>
            <div className="flex items-center gap-4 mt-3">
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 6H34M34 6L28 1M34 6L28 11" stroke="#FFC107" strokeWidth="2"/>
                <circle cx="36" cy="6" r="3" fill="#FFC107"/>
              </svg>
              <p className="font-semibold text-white text-lg drop-shadow-md">
                We are here to help you
              </p>
              <svg width="40" height="12" viewBox="0 0 40 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-180">
                <path d="M0 6H34M34 6L28 1M34 6L28 11" stroke="#FFC107" strokeWidth="2"/>
                <circle cx="36" cy="6" r="3" fill="#FFC107"/>
              </svg>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
          
          {/* LEFT: Contact Information */}
          <div className="flex-1 flex flex-col justify-center space-y-8 pr-0 lg:pr-8 border-r-0 md:border-r border-[#FFC107]/20">
            <Reveal delay={100}>
              <div className="flex items-center gap-5">
                <Phone className="text-[#FFC107] w-6 h-6 flex-shrink-0" fill="#FFC107" strokeWidth={0} />
                <p className="text-white font-semibold text-base">+91 8884866644</p>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="flex items-start gap-5">
                <MapPin className="text-[#FFC107] w-7 h-7 flex-shrink-0 mt-1" fill="#FFC107" strokeWidth={1} stroke="#0a0500" />
                <p className="text-white font-semibold text-base leading-snug">
                  1st cross, 75 |14A, Maruthi Nagar Main Rd, near Surya sweets, Madiwala New Extension, Madiwala, 1st Stage, BTM 1st Stage, Bengaluru, Karnataka 560068
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="flex items-center gap-5">
                <Mail className="text-[#FFC107] w-6 h-6 flex-shrink-0" fill="#FFC107" strokeWidth={1} stroke="#0a0500" />
                <p className="text-white font-semibold text-base">info@mrbiryani.in</p>
              </div>
            </Reveal>

            <Reveal delay={250}>
              <div className="pt-4">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-white font-bold text-xl">Follow Us</h3>
                  <div className="h-px bg-gradient-to-r from-[#FFC107] to-transparent w-16"></div>
                </div>
                <div className="flex gap-4">
                  <a href="https://www.facebook.com/mr-biriyani-btm-1st-stage-bangalore/" aria-label="Facebook" className="w-10 h-10 rounded-md bg-[#1877F2] flex items-center justify-center transition-transform hover:-translate-y-1 shadow-lg">
                    <FacebookIcon className="text-white w-6 h-6" />
                  </a>
                  <a href="https://www.instagram.com/mr.biriyani_bangalore/" aria-label="Instagram" className="w-10 h-10 rounded-md bg-instagram flex items-center justify-center transition-transform hover:-translate-y-1 shadow-lg">
                    <InstagramIcon className="text-white w-6 h-6" />
                  </a>
                  <a href="www.youtube.com/@Mrbiryani5" aria-label="YouTube" className="w-10 h-10 rounded-md bg-[#FF0000] flex items-center justify-center transition-transform hover:-translate-y-1 shadow-lg">
                    <YoutubeIcon className="text-white w-7 h-7" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT: Contact Form */}
          <Reveal delay={300} className="flex-1 flex flex-col justify-center">
            {sendError && (
              <div role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {sendError}
              </div>
            )}

            {submitted && (
              <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-green-500/50 bg-[#110502]/90 backdrop-blur-md p-4 shadow-lg">
                <CheckCircle2 size={20} className="shrink-0 text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-400">Message received</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-300">
                    Thank you. The restaurant has received your message and will reply by email.
                  </p>
                </div>
              </div>
            )}

            <div className="w-full bg-[#f8f9fa] rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 md:p-8 space-y-5 flex-grow">
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                    className={inputClass}
                  />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Your Email"
                    required
                    className={inputClass}
                  />
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Your Message"
                    required
                    className={`${inputClass} min-h-[140px] resize-none`}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#FFC107] hover:bg-[#ffcd38] text-black font-bold py-4 flex justify-center items-center gap-2 transition-colors group"
                >
                  Send Message
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                </button>
              </form>
            </div>
          </Reveal>
        </div>

        {/* BOTTOM: Interactive Google Map Banner */}
        <Reveal delay={400}>
          <div className="mt-14 w-full rounded-2xl overflow-hidden flex flex-col md:flex-row border border-[#FFC107]/20 shadow-2xl bg-[#241710]">
            
            <div className="p-8 md:w-1/3 flex flex-row md:flex-col items-center md:items-start md:justify-center gap-4 z-10 bg-[#241710] shadow-xl md:shadow-[10px_0_15px_-3px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-12 flex-shrink-0">
                <MapPin className="text-[#FFC107] w-full h-full" fill="#FFC107" strokeWidth={1} stroke="#241710" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <h3 className="text-[#FFC107] font-bold text-2xl">Find Us Here</h3>
                <a 
                  href="https://www.google.com/maps/search/Mr.+Biryani,+BTM+1st+Stage,+Bengaluru" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#FFC107] font-semibold text-sm flex items-center gap-1 mt-1 hover:underline"
                >
                  View on Google Maps <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div className="md:w-2/3 h-72 md:h-auto min-h-[300px] relative bg-gray-200">
              {/* Fully interactive embedded Google Map */}
              <iframe 
                title="Mr. Biryani Location"
                src="https://maps.google.com/maps?q=Mr.+Biryani,+BTM+1st+Stage,+Bengaluru&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                className="w-full h-full border-0 absolute inset-0 filter contrast-[1.05]" 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>

          </div>
        </Reveal>
        
      </div>
    </main>
  )
}