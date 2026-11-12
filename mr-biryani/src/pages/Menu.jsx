import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Flame, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { addToCart } from '../utils/cart'
import { MotionStyles, Reveal, SafeImg } from '../components/Motion'

const categories = ['Biryani', 'Family Pack', 'Starters']

const base = 'https://images.unsplash.com'
const images = {
  biryani: `${base}/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=700&q=85`,
  family: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=85`,
  starters: `${base}/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85`,
}

/* Extra photos so cards in one category are not all identical */
const biryaniAlt = `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=700&q=85`

const singleBiryani = [
  ['Hyderabadi Dum Biryani', 170],
  ['Mr. Biryani Special', 200],
  ['Fry-Piece Chicken Biryani', 180],
  ['Guntur Chicken Biryani', 180],
  ['Nellore Chicken Biryani', 180],
  ['Andhra Style Chicken Biryani', 180],
  ['Rainbow Chicken Biryani', 210],
  ['Mughlai Chicken Biryani', 200],
  ['Wings Chicken Biryani', 180],
  ['Lollipop Chicken Biryani', 180],
  ['Mutton Biryani', 240],
  ['Fish Biryani', 220],
  ['Prawns Biryani', 240],
  ['Egg Biryani', 130],
  ['Paneer Biryani', 160],
  ['Mushroom Biryani', 140],
  ['Biryani Rice', 110],
]

const familyBiryani = [
  ['Hyderabadi Dum Biryani', 460],
  ['Mr. Biryani Special', 550],
  ['Fry-Piece Chicken Biryani', 490],
  ['Guntur Chicken Biryani', 490],
  ['Nellore Chicken Biryani', 490],
  ['Andhra Style Chicken Biryani', 490],
  ['Rainbow Chicken Biryani', 570],
  ['Mughlai Chicken Biryani', 550],
  ['Wings Chicken Biryani', 490],
  ['Lollipop Chicken Biryani', 490],
  ['Mutton Biryani', 670],
  ['Fish Biryani', 610],
  ['Prawns Biryani', 670],
]

const starters = [
  ['Andhra Chicken Fry', 180],
  ['Guntur Chicken Fry', 180],
  ['Nellore Chicken Fry', 180],
  ['Kakinada Chicken Fry', 180],
  ['Andhra Chilly Chicken', 180],
  ['Chicken Ghee Roast', 180],
  ['Kshatriya Chicken Wings', 180],
  ['Andhra Special Chicken Fry', 180],
  ['Andhra Mutton Fry', 200],
  ['Mutton Ghee Roast', 240],
  ['Mutton Pepper Dry', 240],
  ['Andhra Fish Fry', 220],
  ['Apollo Fish Fry', 220],
  ['Andhra Prawns Fry', 240],
  ['Prawns Ghee Roast', 240],
]

const menuItems = [
  ...singleBiryani.map(([name, price], index) => ({
    id: `biryani-${index}`,
    name,
    price,
    category: 'Biryani',
    subtitle: 'Single Serving',
    image: index % 2 === 0 ? images.biryani : biryaniAlt,
  })),
  ...familyBiryani.map(([name, price], index) => ({
    id: `family-${index}`,
    name,
    price,
    category: 'Family Pack',
    subtitle: 'Serves 3–4 Persons',
    image: index % 2 === 0 ? images.family : images.biryani,
  })),
  ...starters.map(([name, price], index) => ({
    id: `starter-${index}`,
    name,
    price,
    category: 'Starters',
    subtitle: 'Non-Veg Starter',
    image: images.starters,
  })),
]

/* Each category gets its own colour */
const categoryDetails = {
  Biryani: {
    heading: 'Signature Biryanis',
    description: 'Authentic flavours for every biryani lover.',
    image: images.biryani,
    gradient: 'from-orange-500 to-red-600',
    text: 'text-orange-400',
    hover: 'hover:border-orange-500/70 hover:shadow-orange-500/20',
    group: 'group-hover:text-orange-400',
    shadow: 'shadow-orange-500/25',
  },
  'Family Pack': {
    heading: 'Family Feast',
    description: 'Generous portions made for sharing.',
    image: images.family,
    gradient: 'from-emerald-400 to-teal-600',
    text: 'text-emerald-400',
    hover: 'hover:border-emerald-500/70 hover:shadow-emerald-500/20',
    group: 'group-hover:text-emerald-400',
    shadow: 'shadow-emerald-500/25',
  },
  Starters: {
    heading: 'Andhra Starters',
    description: 'Bold, spicy and flavour-packed favourites.',
    image: images.starters,
    gradient: 'from-fuchsia-500 to-purple-600',
    text: 'text-fuchsia-400',
    hover: 'hover:border-fuchsia-500/70 hover:shadow-fuchsia-500/20',
    group: 'group-hover:text-fuchsia-400',
    shadow: 'shadow-fuchsia-500/25',
  },
}

function Menu() {
  const [activeCategory, setActiveCategory] = useState('Biryani')
  const navigate = useNavigate()

  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.category === activeCategory),
    [activeCategory],
  )

  const categoryCounts = {
    Biryani: singleBiryani.length,
    'Family Pack': familyBiryani.length,
    Starters: starters.length,
  }

  const handleAddToCart = (item) => {
    addToCart(item)
    navigate('/order')
  }

  const d = categoryDetails[activeCategory]

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <MotionStyles />

      {/* Menu Hero */}
      <section className="relative isolate flex min-h-[300px] items-center justify-center overflow-hidden px-5 py-20 text-center sm:min-h-[390px]">
        <div
          className="kenburns absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage: `url("${images.biryani.replace('w=700', 'w=1800')}")`,
          }}
        />
        <div className="absolute inset-0 -z-10 bg-black/75" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080808] via-black/30 to-[#5a1a1a]/40" />

        <div className="floaty absolute -left-10 top-0 -z-10 h-64 w-64 rounded-full bg-orange-500/25 blur-[90px]" />
        <div
          className="floaty absolute -right-10 bottom-0 -z-10 h-64 w-64 rounded-full bg-fuchsia-600/25 blur-[90px]"
          style={{ animationDelay: '-3s' }}
        />

        <div className="mx-auto max-w-3xl">
          <div className="rise-in mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4A63A]/40 bg-[#080808]/90 px-4 py-2 text-xs font-bold uppercase tracking-[2px] text-[#D4A63A]">
            <Flame size={15} className="text-orange-400" />
            House of Andhra Flavours
          </div>

          <h1
            className="rise-in font-serif text-5xl font-bold sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '.15s' }}
          >
            Explore Our <span className="text-shimmer">Menu</span>
          </h1>

          <p
            className="rise-in mx-auto mt-5 max-w-xl text-sm leading-7 text-neutral-200 sm:text-base"
            style={{ animationDelay: '.3s' }}
          >
            Discover delicious biryanis, family packs and authentic Andhra
            starters prepared for every craving.
          </p>

          <div
            className="rise-in mx-auto mt-7 flex w-36 items-center gap-3"
            style={{ animationDelay: '.45s' }}
          >
            <span className="h-px flex-1 bg-[#D4A63A]" />
            <UtensilsCrossed size={19} className="text-[#D4A63A]" />
            <span className="h-px flex-1 bg-[#D4A63A]" />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 via-[#D4A63A] to-fuchsia-500" />
      </section>

      {/* Menu Content */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-8 sm:pt-12">
        {/* Category Navigation */}
        <div className="mb-10">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
            Choose Your Favourite
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => {
              const isActive = activeCategory === category
              const c = categoryDetails[category]

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-300 sm:px-6 ${
                    isActive
                      ? `border-transparent bg-gradient-to-r ${c.gradient} -translate-y-0.5 text-white shadow-lg ${c.shadow}`
                      : 'border-white/15 bg-[#111010] text-neutral-300 hover:border-[#D4A63A] hover:text-[#D4A63A]'
                  }`}
                >
                  {category}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-neutral-400'
                    }`}
                  >
                    {categoryCounts[category]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Category Banner (re-animates when the category changes) */}
        <div
          key={`banner-${activeCategory}`}
          className="pop-in relative mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#111010]"
        >
          <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${d.gradient}`} />
          <div className="grid items-center md:grid-cols-[1fr_240px]">
            <div className="px-6 py-7 sm:px-9 sm:py-9">
              <p className={`text-xs font-bold uppercase tracking-[3px] ${d.text}`}>
                Mr. Biriyani Special
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">
                {d.heading}
              </h2>
              <p className="mt-2 text-sm text-neutral-400">{d.description}</p>
            </div>

            <div className="relative hidden h-full min-h-[150px] md:block">
              <SafeImg
                src={d.image}
                fallback={images.biryani}
                alt={d.heading}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#111010] to-transparent" />
            </div>
          </div>
        </div>

        {/* Item Count */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-white sm:text-2xl">
              {activeCategory}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Select a dish to add it to your order.
            </p>
          </div>

          <span className={`rounded-full border border-white/15 bg-[#111010] px-4 py-2 text-xs font-semibold ${d.text}`}>
            {filteredItems.length} Items
          </span>
        </div>

        {/* Food Cards: key includes category so the stagger replays on switch */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {filteredItems.map((item, i) => (
            <article
              key={`${activeCategory}-${item.id}`}
              style={{ animationDelay: `${Math.min(i * 45, 500)}ms` }}
              className={`rise-in group flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111010] transition duration-300 hover:-translate-y-1.5 hover:shadow-xl sm:rounded-2xl ${d.hover}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#1b1714]">
                <SafeImg
                  src={item.image}
                  fallback={images.biryani}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div
                  className={`absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r ${d.gradient} transition-transform duration-500 group-hover:scale-x-100`}
                />

                <span
                  className={`absolute bottom-3 left-3 rounded-full bg-gradient-to-r ${d.gradient} px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow`}
                >
                  {item.category}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <h3 className={`min-h-[40px] text-sm font-bold leading-5 text-white transition sm:min-h-[48px] sm:text-base ${d.group}`}>
                  {item.name}
                </h3>

                <p className="mt-1 text-[10px] text-neutral-500 sm:text-xs">
                  {item.subtitle}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <p className={`bg-gradient-to-r ${d.gradient} bg-clip-text text-base font-extrabold text-transparent sm:text-xl`}>
                    ₹{item.price}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    aria-label={`Add ${item.name} to cart`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#D4A63A] px-3 py-2 text-xs font-extrabold text-black transition duration-300 hover:bg-[#E8BD57] hover:shadow-lg hover:shadow-[#D4A63A]/25 active:scale-95 sm:px-4"
                  >
                    <ShoppingBag size={14} />
                    Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-[#D4A63A]/20 bg-gradient-to-br from-[#321010] via-[#4a1414] to-[#2a0b2a] px-5 py-9 text-center sm:px-10">
            <div className="spin-slow pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-2 border-dashed border-[#D4A63A]/30" />

            <h2 className="relative font-serif text-2xl font-bold sm:text-3xl">
              Your Next Favourite Meal Awaits
            </h2>
            <p className="relative mt-3 text-sm text-neutral-300">
              Choose your favourites and enjoy the taste of Mr. Biriyani.
            </p>

            <span className="pulse-ring relative mt-6 inline-flex rounded-lg">
              <button
                type="button"
                onClick={() => navigate('/order')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D4A63A] px-7 py-3 font-bold text-black transition hover:-translate-y-1 hover:bg-[#E8BD57]"
              >
                View Your Order
                <ArrowRight size={17} />
              </button>
            </span>
          </div>
        </Reveal>
      </section>
    </main>
  )
}

export default Menu
