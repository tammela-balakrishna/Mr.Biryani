import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChefHat,
  Smile,
  ThumbsUp,
} from 'lucide-react'
import { MotionStyles, Reveal, SafeImg } from '../components/Motion'

const base = 'https://images.unsplash.com'
const photos = {
  hero: `${base}/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=85`,
  main: `${base}/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1200&q=85`,
}

const highlights = [
  'Authentic Andhra Taste',
  'Generous Portions',
  'Great Value for Money',
  'Warm & Friendly Ambience',
]

const promises = [
  {
    icon: ChefHat,
    title: 'Authentic\nTaste',
  },
  {
    icon: ThumbsUp,
    title: 'Quality\nFood',
  },
  {
    icon: Smile,
    title: 'Happy\nCustomers',
  },
]

function About() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] text-white relative">
      <MotionStyles />
      
      {/* Background ambient glow matching the image */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-t from-red-900/20 via-orange-900/10 to-transparent pointer-events-none -z-10" />

      {/* Main Hero Section */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          
          {/* Left Column: Content */}
          <Reveal className="flex flex-col items-start max-w-lg">
            <h1 className="font-serif text-5xl font-bold tracking-wide sm:text-6xl mb-2">
              About Us
            </h1>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#FFD700] mb-4">
              House of Andhra Flavours
            </h2>
            
            {/* Vintage style divider */}
            <div className="flex items-center gap-2 mb-8 opacity-80">
              <span className="h-[2px] w-12 bg-[#FFD700]" />
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full border border-[#FFD700]" />
                <span className="h-2 w-2 rounded-full border border-[#FFD700]" />
              </div>
              <span className="h-[2px] w-12 bg-[#FFD700]" />
            </div>

            <p className="mb-8 text-base leading-relaxed text-neutral-200">
              Mr. Biryani is a highly rated, casual eatery located in the BTM 1st Stage / Madiwala area, celebrated for its authentic and punchy Andhra and Hyderabadi flavours.
            </p>

            <div className="space-y-4 mb-10 w-full">
              {highlights.map((item, i) => (
                <Reveal key={item} delay={100 + i * 100}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD700]">
                      <Check size={16} strokeWidth={4} className="text-black" />
                    </div>
                    <span className="text-base font-semibold text-neutral-100">
                      {item}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <Link
              to="/menu"
              className="inline-flex items-center gap-2 rounded-md bg-[#FFD700] px-7 py-3 text-sm font-bold text-black transition duration-300 hover:-translate-y-1 hover:bg-yellow-400 hover:shadow-lg hover:shadow-[#FFD700]/20"
            >
              Our Menu
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </Reveal>

          {/* Right Column: Restaurant Image */}
          <Reveal delay={200} className="relative w-full h-[400px] lg:h-[600px]">
             {/* Decorative background glow behind image */}
             <div className="absolute -inset-4 rounded-3xl bg-orange-500/20 blur-2xl -z-10" />
             
             <SafeImg
               src={photos.main}
               alt="Mr. Biryani Restaurant Exterior"
               className="h-full w-full object-cover rounded-xl shadow-2xl border border-white/5"
               loading="lazy"
             />
          </Reveal>
        </div>
      </section>

      {/* Our Promise Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-20 sm:px-8 sm:pb-28">
        <Reveal className="flex items-center justify-center gap-4 mb-16">
          <span className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-neutral-400" />
          <h3 className="text-2xl sm:text-3xl font-bold tracking-wide text-white">Our Promise</h3>
          <span className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-neutral-400" />
        </Reveal>

        <div className="grid grid-cols-3 gap-4 sm:gap-8">
          {promises.map(({ icon: Icon, title }, i) => (
            <Reveal key={title} delay={300 + i * 150} className="flex flex-col items-center text-center">
              <Icon size={48} strokeWidth={1.5} className="mb-4 text-[#FFD700]" />
              <h4 className="text-sm sm:text-base font-semibold text-white whitespace-pre-line leading-tight">
                {title}
              </h4>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  )
}

export default About