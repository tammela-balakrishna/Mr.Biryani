import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChefHat,
  Clock,
  Flame,
  UtensilsCrossed,
  Truck,
  Award,
  Star,
} from 'lucide-react'

import Button from '../components/Button'

/* ---------- DATA ---------- */

const IMG = {
  dum: 'https://images.unsplash.com/photo-1563379091339-03246963d96c',
  fry: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0',
  special: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0',
}
const img = (base, w, q = 85) => `${base}?auto=format&fit=crop&w=${w}&q=${q}`

const heroSlides = [IMG.dum, IMG.special, IMG.fry]

const featuredDishes = [
  {
    name: 'Hyderabadi Dum Biryani',
    description:
      'Traditional dum-cooked biryani with aromatic spices and tender chicken.',
    price: '₹170',
    tag: 'BEST SELLER',
    image: img(IMG.dum, 900),
    color: 'from-orange-500 to-red-600',
    glow: 'hover:shadow-orange-500/30 hover:border-orange-500/70',
  },
  {
    name: 'Fry-Piece Chicken Biryani',
    description:
      'Flavourful Andhra-style biryani topped with delicious chicken pieces.',
    price: '₹180',
    tag: 'POPULAR',
    image: img(IMG.fry, 900),
    color: 'from-emerald-400 to-teal-600',
    glow: 'hover:shadow-emerald-500/30 hover:border-emerald-500/70',
  },
  {
    name: 'Mr. Biryani Special',
    description:
      'Our signature biryani prepared with a special blend of spices.',
    price: '₹200',
    tag: 'CHEF SPECIAL',
    image: img(IMG.special, 900),
    color: 'from-fuchsia-500 to-purple-600',
    glow: 'hover:shadow-fuchsia-500/30 hover:border-fuchsia-500/70',
  },
]

const features = [
  {
    icon: ChefHat,
    title: 'Authentic Recipes',
    description: 'Traditional Andhra and Hyderabadi flavours in every bite.',
    gradient: 'from-orange-400 to-red-500',
  },
  {
    icon: Flame,
    title: 'Fresh Ingredients',
    description: 'Quality ingredients and aromatic spices in every preparation.',
    gradient: 'from-lime-400 to-emerald-500',
  },
  {
    icon: Award,
    title: 'Rich Flavours',
    description: 'Carefully prepared biryani with unforgettable taste.',
    gradient: 'from-yellow-300 to-amber-500',
  },
  {
    icon: Truck,
    title: 'Easy Ordering',
    description: 'Explore our menu and get in touch to place your order.',
    gradient: 'from-sky-400 to-fuchsia-500',
  },
]

const marqueeItems = [
  'Dum Biryani',
  'Andhra Spice',
  'Fry-Piece Chicken',
  'Hyderabadi Flavour',
  'Slow Cooked',
  'Aromatic Masala',
]
const marqueeColors = [
  'text-[#D4A63A]',
  'text-orange-400',
  'text-emerald-400',
  'text-fuchsia-400',
  'text-sky-400',
  'text-rose-400',
]

/* ---------- HOOKS ---------- */

function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return [ref, shown]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, shown] = useReveal()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function Counter({ to, suffix = '' }) {
  const [ref, shown] = useReveal()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!shown) return
    let frame
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / 1400, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [shown, to])

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  )
}

/* ---------- SMALL COMPONENTS ---------- */

function SectionHeading({ eyebrow, title, highlight, description }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-4 text-xs font-bold uppercase tracking-[4px] text-[#D4A63A] sm:text-sm">
        {eyebrow}
      </p>

      <h2 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
        {title} <span className="text-shimmer">{highlight}</span>
      </h2>

      {description && (
        <p className="mt-5 text-sm leading-7 text-neutral-400 sm:text-base">
          {description}
        </p>
      )}
    </Reveal>
  )
}

function Img({ className = '', ...props }) {
  return (
    <img
      {...props}
      className={className}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}

/* ---------- PAGE ---------- */

function Home() {
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setSlide((s) => (s + 1) % heroSlides.length),
      5000,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <main className="overflow-hidden bg-[#080808] text-white">
      {/* Animations live here so no Tailwind config change is needed */}
      <style>{`
        @keyframes kenburns { from { transform: scale(1) } to { transform: scale(1.12) } }
        @keyframes floaty { 0%,100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(-22px) rotate(8deg) } }
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes shimmer { to { background-position: 200% center } }
        @keyframes riseIn { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(212,166,58,.55) } 100% { box-shadow: 0 0 0 22px rgba(212,166,58,0) } }
        @keyframes spinSlow { to { transform: rotate(360deg) } }

        .kenburns { animation: kenburns 9s ease-out forwards }
        .floaty { animation: floaty 7s ease-in-out infinite }
        .marquee-track { animation: marquee 28s linear infinite }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused }
        .rise-in { opacity: 0; animation: riseIn .9s ease-out forwards }
        .pulse-ring { animation: pulseRing 2s ease-out infinite }
        .spin-slow { animation: spinSlow 30s linear infinite }
        .text-shimmer {
          background: linear-gradient(90deg,#D4A63A,#ff7a3d,#ff3d77,#D4A63A);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          animation: shimmer 5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .kenburns,.floaty,.marquee-track,.rise-in,.pulse-ring,.spin-slow,.text-shimmer { animation: none !important; opacity: 1 }
        }
      `}</style>

      {/* HERO */}
      <section className="relative isolate flex min-h-[650px] items-center overflow-hidden sm:min-h-[740px]">
        {heroSlides.map((src, i) => (
          <div
            key={src}
            aria-hidden="true"
            className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-[1500ms] ${
              i === slide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              key={i === slide ? `on-${slide}` : `off-${i}`}
              className={`h-full w-full bg-cover bg-center ${
                i === slide ? 'kenburns' : ''
              }`}
              style={{ backgroundImage: `url('${img(src, 1920, 90)}')` }}
            />
          </div>
        ))}

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/80 to-black/30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080808] via-transparent to-[#5a1a1a]/30" />

        {/* floating colour blobs */}
        <div className="floaty pointer-events-none absolute -left-16 top-24 -z-10 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div
          className="floaty pointer-events-none absolute right-10 top-1/3 -z-10 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl"
          style={{ animationDelay: '-3s' }}
        />
        <div
          className="floaty pointer-events-none absolute bottom-10 right-1/3 -z-10 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl"
          style={{ animationDelay: '-5s' }}
        />

        <div className="mx-auto w-full max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-3xl">
            <div
              className="rise-in mb-7 inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/50 bg-[#321010]/90 px-4 py-2 backdrop-blur"
              style={{ animationDelay: '.1s' }}
            >
              <Flame size={16} className="text-orange-400" />
              <span className="text-[10px] font-bold tracking-[2px] text-[#D4A63A] sm:text-xs">
                HOUSE OF ANDHRA FLAVOURS
              </span>
            </div>

            <h1
              className="rise-in font-serif text-5xl font-bold leading-[1.12] text-white sm:text-6xl lg:text-7xl xl:text-8xl"
              style={{ animationDelay: '.25s' }}
            >
              Experience the
              <span className="text-shimmer my-2 block">Royal Taste</span>
              of Biryani.
            </h1>

            <p
              className="rise-in mt-7 max-w-xl text-sm leading-8 text-neutral-200 sm:text-lg"
              style={{ animationDelay: '.45s' }}
            >
              Discover the authentic taste of Andhra and Hyderabadi cuisine.
              Every serving is crafted with aromatic spices, fresh ingredients
              and a passion for unforgettable flavour.
            </p>

            <div
              className="rise-in mt-9 flex flex-wrap gap-4"
              style={{ animationDelay: '.6s' }}
            >
              <span className="pulse-ring inline-flex rounded-full">
                <Button to="/menu" variant="gold" size="lg">
                  Explore Menu
                  <ArrowRight size={18} />
                </Button>
              </span>

              <Button to="/about" variant="outline" size="lg">
                Discover Our Story
              </Button>
            </div>

            <div
              className="rise-in mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-white/20 pt-7"
              style={{ animationDelay: '.8s' }}
            >
              {[
                ['Fresh', 'Quality Ingredients', 'text-emerald-400'],
                ['Authentic', 'Andhra Flavours', 'text-orange-400'],
                ['Special', 'Biryani Recipes', 'text-fuchsia-400'],
              ].map(([title, description, color]) => (
                <div key={title}>
                  <p className={`font-serif text-xl font-bold sm:text-2xl ${color}`}>
                    {title}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-neutral-400 sm:text-xs">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* slide dots */}
        <div className="absolute bottom-8 right-6 flex gap-2 lg:right-10">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === slide ? 'w-8 bg-[#D4A63A]' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500" />
      </section>

      {/* MARQUEE STRIP */}
      <section
        className="marquee-wrap overflow-hidden border-y border-[#D4A63A]/30 bg-gradient-to-r from-[#321010] via-[#4a1414] to-[#321010] py-4"
        aria-label="Highlights"
      >
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span
              key={i}
              className={`flex items-center gap-10 font-serif text-lg font-semibold ${
                marqueeColors[i % marqueeColors.length]
              }`}
            >
              {item}
              <Star size={14} className="fill-current opacity-70" />
            </span>
          ))}
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:py-24 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal className="relative mx-auto w-full max-w-xl lg:mx-0">
          {/* rotating colour ring */}
          <div className="spin-slow absolute -inset-4 rounded-[2rem] bg-[conic-gradient(from_0deg,#D4A63A,#ff3d77,#7c3aed,#10b981,#D4A63A)] opacity-60 blur-md" />

          <div className="relative overflow-hidden rounded-2xl border border-[#D4A63A]/40 bg-[#080808]">
            <Img
              src={img(IMG.special, 1000)}
              alt="Traditional Indian biryani"
              className="h-[340px] w-full object-cover transition duration-700 hover:scale-110 sm:h-[440px]"
              loading="lazy"
            />
          </div>

          {/* small overlapping photo */}
          <div className="floaty absolute -left-6 -top-6 hidden h-28 w-28 overflow-hidden rounded-full border-4 border-[#D4A63A] shadow-xl sm:block">
            <Img
              src={img(IMG.fry, 300)}
              alt="Fry-piece chicken biryani"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="absolute -bottom-6 right-3 rounded-xl border border-[#D4A63A]/40 bg-[#17110A] p-5 shadow-xl sm:right-[-15px]">
            <UtensilsCrossed className="mb-2 text-orange-400" size={27} />
            <p className="font-serif text-lg font-bold text-white">MR. BIRIYANI</p>
            <p className="mt-1 text-xs text-neutral-400">House of Andhra Flavours</p>
          </div>
        </Reveal>

        <Reveal delay={150} className="pt-5 lg:pt-0">
          <p className="mb-4 text-xs font-bold uppercase tracking-[4px] text-[#D4A63A] sm:text-sm">
            Welcome to Mr. BIRIYANI
          </p>

          <h2 className="font-serif text-4xl font-bold leading-tight sm:text-5xl">
            More Than Food.
            <span className="text-shimmer mt-2 block">It's An Experience.</span>
          </h2>

          <p className="mt-7 text-sm leading-8 text-neutral-400 sm:text-base">
            At Mr. BIRIYANI, we celebrate the rich culinary traditions of Andhra
            and Hyderabad. Our focus is on authentic flavours, aromatic spices
            and satisfying biryani prepared with care.
          </p>

          <p className="mt-4 text-sm leading-8 text-neutral-400 sm:text-base">
            From classic dum biryani to our special signature dishes, discover
            flavours that make every meal memorable.
          </p>

          <Button to="/about" variant="secondary" className="mt-8">
            Know More About Us
            <ArrowRight size={17} />
          </Button>
        </Reveal>
      </section>

      {/* FEATURED DISHES */}
      <section className="relative bg-gradient-to-b from-[#111010] via-[#1a0d0d] to-[#111010] px-5 py-20 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Our Specialities"
            title="Explore Our"
            highlight="Menu"
            description="Taste the richness of authentic biryani, made for people who love great food."
          />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredDishes.map((dish, i) => (
              <Reveal key={dish.name} delay={i * 150}>
                <article
                  className={`group h-full overflow-hidden rounded-2xl border border-white/10 bg-[#181818] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${dish.glow}`}
                >
                  <div className="relative h-60 overflow-hidden sm:h-64">
                    <Img
                      src={dish.image}
                      alt={dish.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:rotate-1 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div
                      className={`absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r ${dish.color} transition-transform duration-500 group-hover:scale-x-100`}
                    />

                    <span
                      className={`absolute left-4 top-4 rounded-md bg-gradient-to-r ${dish.color} px-3 py-2 text-[10px] font-extrabold tracking-wider text-white shadow-lg`}
                    >
                      {dish.tag}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-xl font-bold text-white">
                        {dish.name}
                      </h3>
                      <span
                        className={`shrink-0 bg-gradient-to-r ${dish.color} bg-clip-text text-lg font-bold text-transparent`}
                      >
                        {dish.price}
                      </span>
                    </div>

                    <p className="mt-4 min-h-[72px] text-sm leading-6 text-neutral-400">
                      {dish.description}
                    </p>

                    <Link
                      to="/menu"
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#D4A63A] transition-all duration-300 hover:gap-4 hover:text-[#E8BD57]"
                    >
                      View Menu
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Button to="/menu" variant="gold" size="lg">
              View Full Menu
              <ArrowRight size={18} />
            </Button>
          </Reveal>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow="Why Choose Us"
          title="The Taste That"
          highlight="Matters"
          description="Great food begins with quality, passion and authentic flavours."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Reveal key={feature.title} delay={i * 120}>
                <article className="group h-full rounded-2xl border border-white/10 bg-[#151515] p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:border-[#D4A63A]/60 hover:bg-[#1C1912]">
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${feature.gradient} shadow-lg transition duration-500 group-hover:rotate-[360deg] group-hover:scale-110`}
                  >
                    <Icon size={29} className="text-white" />
                  </div>

                  <h3 className="mt-6 font-serif text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-400">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* PHOTO STRIP */}
      <section className="grid grid-cols-3 gap-1 px-1" aria-label="Biryani gallery">
        {[IMG.dum, IMG.fry, IMG.special].map((src, i) => (
          <div key={src} className="group relative h-40 overflow-hidden sm:h-64 lg:h-80">
            <Img
              src={img(src, 700, 80)}
              alt="Freshly served biryani"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              className={`absolute inset-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-0 ${
                ['bg-orange-600/40', 'bg-emerald-600/40', 'bg-fuchsia-600/40'][i]
              }`}
            />
          </div>
        ))}
      </section>

      {/* STATS */}
      <section className="bg-[#111010] px-5 py-16 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            [3, '+', 'Signature Biryanis', 'text-orange-400'],
            [100, '%', 'Fresh Ingredients', 'text-emerald-400'],
            [2, '', 'Regional Cuisines', 'text-fuchsia-400'],
            [1, '', 'Royal Taste', 'text-[#D4A63A]'],
          ].map(([to, suffix, label, color]) => (
            <div key={label}>
              <p className={`font-serif text-5xl font-bold ${color}`}>
                <Counter to={to} suffix={suffix} />
              </p>
              <p className="mt-2 text-xs text-neutral-400 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SPECIAL HIGHLIGHT */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#321010] via-[#4a1414] to-[#2a0b2a] px-5 py-20 sm:py-24">
        <div className="spin-slow pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border-2 border-dashed border-[#D4A63A]/30" />
        <div className="floaty pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-orange-400/30" />
        <div className="floaty pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full border border-fuchsia-400/30" />

        <Reveal className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A] sm:text-sm">
              Your Biryani Moment Awaits
            </p>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Craving Something Delicious?
            </h2>
            <p className="mt-4 text-sm leading-7 text-neutral-300 sm:text-base">
              Explore our menu and discover your next favourite biryani.
            </p>
          </div>

          <span className="pulse-ring inline-flex rounded-full">
            <Button to="/order" variant="gold" size="lg">
              Order Now
              <ArrowRight size={18} />
            </Button>
          </span>
        </Reveal>
      </section>

      {/* CUSTOMER EXPERIENCE */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:py-24 lg:px-8">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#D4A63A]/30 bg-[#15120D] px-7 py-12 text-center sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,61,0.15),transparent_60%)]" />

            <Clock className="relative mx-auto text-orange-400" size={34} />

            <p className="relative mt-5 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A] sm:text-sm">
              Made With Passion
            </p>

            <h2 className="relative mt-4 font-serif text-3xl font-bold sm:text-4xl">
              Every Plate Tells a Story.
            </h2>

            <p className="relative mx-auto mt-5 max-w-xl text-sm leading-8 text-neutral-400 sm:text-base">
              Join us and experience the flavours of Andhra and Hyderabad
              through our carefully prepared biryani. Your next memorable meal
              starts here.
            </p>

            <Button to="/contact" variant="secondary" className="relative mt-8">
              Contact Us
              <ArrowRight size={17} />
            </Button>
          </div>
        </Reveal>
      </section>
    </main>
  )
}

export default Home
