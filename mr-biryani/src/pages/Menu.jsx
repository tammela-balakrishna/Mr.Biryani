import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addToCart } from '../utils/cart'
import { MotionStyles, Reveal, SafeImg } from '../components/Motion'

// Restored Original Categories
const categories = ['Biryani', 'Family Pack', 'Starters']

const base = 'https://images.unsplash.com'
const images = {
  biryani: `${base}/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=700&q=85`,
  family: `${base}/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=85`,
  starters: `${base}/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85`,
}

/* Extra photos so cards in one category are not all identical */
const biryaniAlt = `${base}/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=700&q=85`

// Restored Original Data
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

function Menu() {
  const [activeCategory, setActiveCategory] = useState('Biryani')
  const navigate = useNavigate()

  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.category === activeCategory),
    [activeCategory],
  )

  const handleAddToCart = (item) => {
    addToCart(item)
    navigate('/order')
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <MotionStyles />

      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-red-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-bl from-orange-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Header Section */}
      <section className="pt-16 pb-8 text-center relative z-10">
        <Reveal>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-wide">
            Our Menu
          </h1>
          <p className="text-sm md:text-base text-neutral-200 mb-4">
            A perfect blend of tradition and taste
          </p>
          
          {/* Vintage Divider */}
          <div className="flex items-center justify-center gap-2 mb-8 opacity-80">
            <span className="h-[1px] w-16 bg-[#FFD700]" />
            <div className="flex gap-1 items-center">
               <span className="h-1.5 w-1.5 rounded-full border border-[#FFD700]" />
               <svg width="24" height="12" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 0C14 4 18 6 24 6C18 6 14 8 12 12C10 8 6 6 0 6C6 6 10 4 12 0Z" fill="#FFD700"/>
               </svg>
               <span className="h-1.5 w-1.5 rounded-full border border-[#FFD700]" />
            </div>
            <span className="h-[1px] w-16 bg-[#FFD700]" />
          </div>

          {/* Category Navigation */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-4 max-w-4xl mx-auto">
            {categories.map((category) => {
              const isActive = activeCategory === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20'
                      : 'bg-transparent border border-white/20 text-white hover:border-[#FFD700] hover:text-[#FFD700]'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </Reveal>
      </section>

      {/* Menu Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
          {filteredItems.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i * 50, 400)}>
              <article className="bg-[#f8f9fa] rounded-xl p-4 flex flex-col items-center text-center transition-transform hover:-translate-y-1 hover:shadow-xl h-full">
                {/* Food Image */}
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-4 bg-gray-200">
                  <SafeImg
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 w-full justify-between items-center">
                  <div className="mb-3">
                    <h3 className="text-black font-bold text-sm sm:text-base leading-snug mb-1 whitespace-pre-line">
                      {item.name}
                    </h3>
                    <p className="text-gray-500 text-xs font-medium">
                      {item.subtitle}
                    </p>
                  </div>
                  
                  <p className="text-black font-extrabold text-lg sm:text-xl mb-4">
                    ₹{item.price}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="bg-[#FFD700] hover:bg-[#E6C200] text-black font-bold text-sm px-6 py-2 rounded-full transition-colors w-max mt-auto shadow-sm"
                  >
                    Add +
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  )
}

export default Menu