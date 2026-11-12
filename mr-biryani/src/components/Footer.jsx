
import { Link } from 'react-router-dom'
import {
  siFacebook,
  siInstagram,
  siYoutube,
} from 'simple-icons/icons'
import Brand from './Brand'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react'

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'Our Menu', path: '/menu' },
  { name: 'About Us', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Contact Us', path: '/contact' },
]

function SocialIcon({ icon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
      aria-hidden="true"
    >
      <path d={icon.path} />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[#D4A63A]/30 bg-[#080808] text-neutral-300">

      {/* Decorative top line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#321010] via-[#D4A63A] to-[#321010]" />

      {/* Main footer */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10 lg:px-8">

        {/* Brand */}
{/* Brand */}
<div>
  <Brand
    to="/"
    showText={true}
    tone="dark"
    className="origin-left"
  />


          <p className="mt-6 max-w-xs text-sm leading-7 text-neutral-400">
            Experience the authentic taste of Andhra and Hyderabadi cuisine.
            Fresh ingredients, aromatic spices and unforgettable biryani.
          </p>

          {/* Social media */}
          <div className="mt-7 flex gap-3">
            {[
              {
                name: 'Instagram',
                url: 'https://www.instagram.com/',
                icon: siInstagram,
              },
              {
                name: 'Facebook',
                url: 'https://www.facebook.com/',
                icon: siFacebook,
              },
              {
                name: 'YouTube',
                url: 'https://www.youtube.com/',
                icon: siYoutube,
              },
            ].map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#111010] text-neutral-300 transition-all duration-300 hover:-translate-y-1 hover:border-[#D4A63A] hover:bg-[#D4A63A] hover:text-black"
              >
                <SocialIcon icon={social.icon} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="mb-7 font-serif text-xl font-bold text-white">
            Quick Links
          </h3>

          <ul className="space-y-4">
            {quickLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className="group flex items-center gap-2 text-sm text-neutral-400 transition duration-300 hover:translate-x-1 hover:text-[#D4A63A]"
                >
                  <ArrowRight
                    size={14}
                    className="text-[#D4A63A] transition-transform group-hover:translate-x-1"
                  />
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="mb-7 font-serif text-xl font-bold text-white">
            Contact Us
          </h3>

          <ul className="space-y-5 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 shrink-0 text-[#D4A63A]" size={19} />
              <span className="leading-6 text-neutral-400">
                BTM 1st Stage / Madiwala,
                Bengaluru, Karnataka, India.
              </span>
            </li>

            <li className="flex items-center gap-3">
              <Phone className="shrink-0 text-[#D4A63A]" size={18} />
              <span className="text-neutral-400">
                Contact restaurant for phone details
              </span>
            </li>

            <li className="flex items-center gap-3">
              <Mail className="shrink-0 text-[#D4A63A]" size={18} />
              <span className="text-neutral-400">
                Email details coming soon
              </span>
            </li>
          </ul>
        </div>

        {/* Opening hours */}
        <div>
          <h3 className="mb-7 font-serif text-xl font-bold text-white">
            Opening Hours
          </h3>

          <div className="flex items-start gap-3">
            <Clock className="mt-1 shrink-0 text-[#D4A63A]" size={20} />

            <div>
              <p className="text-sm font-semibold text-white">
                Restaurant Hours
              </p>

              <p className="mt-2 text-sm leading-7 text-neutral-400">
                Please contact the restaurant for current opening hours.
              </p>
            </div>
          </div>

          <Link
            to="/order"
            className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#D4A63A] transition-all duration-300 hover:gap-4 hover:text-[#E8BD57]"
          >
            Order Your Biryani
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 bg-[#0D0B0B]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-center text-xs text-neutral-500 sm:flex-row sm:text-left lg:px-8">

          <p>
            © {new Date().getFullYear()} Mr. BIRIYANI. All Rights Reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-5">
            <Link to="/login" className="transition hover:text-[#D4A63A]">
              Login
            </Link>

            <Link to="/register" className="transition hover:text-[#D4A63A]">
              Register
            </Link>

            <Link to="/contact" className="transition hover:text-[#D4A63A]">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
