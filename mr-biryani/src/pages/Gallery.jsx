
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X,

} from 'lucide-react'

const photos = [
  {
    id: 2,
    title: 'Traditional Biryani',
    category: 'Biryani',
    image:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=85',
  },
  {
   id: 1,
    title: 'Hyderabadi Dum Biryani',
    category: 'Biryani',
    image:
      'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1200&q=85', 
  },
  {
    id: 3,
    title: 'Indian Food Special',
    category: 'Food',
    image:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 4,
    title: 'Chicken Biryani',
    category: 'Biryani',
    image:
      'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 5,
    title: 'Indian Spices',
    category: 'Kitchen',
    image:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 6,
    title: 'Delicious Indian Cuisine',
    category: 'Food',
    image:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=85',
  },
]

const filters = ['All', 'Biryani', 'Food', 'Kitchen']

function Gallery() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const filteredPhotos =
    activeFilter === 'All'
      ? photos
      : photos.filter((photo) => photo.category === activeFilter)

  const selectedIndex = filteredPhotos.findIndex(
    (photo) => photo.id === selectedPhoto?.id,
  )

  const showPrevious = (event) => {
    event.stopPropagation()

    const previousIndex =
      (selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length

    setSelectedPhoto(filteredPhotos[previousIndex])
  }

  const showNext = (event) => {
    event.stopPropagation()

    const nextIndex = (selectedIndex + 1) % filteredPhotos.length

    setSelectedPhoto(filteredPhotos[nextIndex])
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">


{/* ========================= HERO SECTION ========================= */}
<section className="relative isolate flex min-h-[400px] items-center justify-center overflow-hidden border-b border-[#D4A63A]/20 px-5 py-24 text-center sm:min-h-[490px] sm:py-28">

  {/* Background image */}
  <div
    className="kenburns absolute inset-0 -z-20 scale-105 bg-cover bg-center"
    style={{
      backgroundImage:
        "url('https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1800&q=85')",
    }}
  />

  {/* Dark cinematic overlays */}
  <div className="absolute inset-0 -z-10 bg-black/75" />
  <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-[#080808]/65 to-[#080808]" />
  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

  {/* Gold ambient lighting */}
  <div className="pointer-events-none absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-[#D4A63A]/10 blur-[120px]" />
  <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#D4A63A]/10 blur-[120px]" />

  {/* Subtle decorative food images */}
  <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

    <img
      src="https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=400&q=75"
      alt=""
      aria-hidden="true"
      className="food-decoration float-food-left absolute left-3 top-8 h-24 w-24 opacity-20 sm:left-12 sm:top-12 sm:h-32 sm:w-32 lg:left-24 lg:h-40 lg:w-40"
    />

    <img
      src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=75"
      alt=""
      aria-hidden="true"
      className="food-decoration float-food-right absolute bottom-8 right-3 h-24 w-24 opacity-20 sm:bottom-12 sm:right-12 sm:h-32 sm:w-32 lg:right-24 lg:h-40 lg:w-40"
    />

    {/* Small decorative gold lights */}
    <div className="absolute left-[18%] top-[25%] h-1.5 w-1.5 rounded-full bg-[#D4A63A]/50 shadow-[0_0_15px_4px_rgba(212,166,58,0.2)]" />
    <div className="absolute bottom-[25%] right-[18%] h-2 w-2 rounded-full bg-[#D4A63A]/40 shadow-[0_0_18px_5px_rgba(212,166,58,0.2)]" />
  </div>

  {/* Hero content */}
  <div className="relative z-10 mx-auto max-w-4xl">

    {/* Badge */}
    <div className="rise-in mb-7 inline-flex items-center gap-3 rounded-full border border-[#D4A63A]/40 bg-black/60 px-6 py-3 shadow-lg shadow-black/30 backdrop-blur-md transition duration-500 hover:border-[#D4A63A] hover:shadow-[#D4A63A]/10">
      <Camera size={17} className="text-[#D4A63A]" />
      <span className="text-[10px] font-bold uppercase tracking-[4px] text-[#E7C46A] sm:text-xs">
        A Visual Feast
      </span>
    </div>

    {/* Heading */}
    <h1 className="rise-in font-serif text-5xl font-bold leading-tight tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-8xl">
      Food <span className="text-shimmer">Gallery</span>
    </h1>

    {/* Description */}
    <p
      className="rise-in mx-auto mt-6 max-w-2xl text-sm leading-8 text-neutral-300 sm:text-lg"
      style={{ animationDelay: '150ms' }}
    >
      Discover the art of authentic Andhra flavours. Explore our
      delicious biryanis, traditional recipes, and unforgettable
      culinary creations.
    </p>

    {/* Gold divider */}
    <div
      className="rise-in mx-auto mt-9 flex w-44 items-center gap-4"
      style={{ animationDelay: '250ms' }}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4A63A]" />
      <ImageIcon size={21} className="text-[#D4A63A]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4A63A]" />
    </div>

    {/* Breadcrumb */}
    <nav
      aria-label="Breadcrumb"
      className="rise-in mt-9 flex items-center justify-center gap-3 text-sm"
      style={{ animationDelay: '350ms' }}
    >
      <Link
        to="/"
        className="text-neutral-400 transition-all duration-300 hover:text-[#D4A63A] hover:underline hover:underline-offset-4"
      >
        Home
      </Link>

      <span className="text-[#D4A63A]">/</span>

      <span className="font-semibold text-[#D4A63A]">
        Gallery
      </span>
    </nav>
  </div>

  {/* Bottom gold accent */}
  <div className="absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#D4A63A]/60 to-transparent" />
</section>


{/* ========================= GALLERY SECTION ========================= */}
<section className="relative isolate overflow-hidden bg-[#080808]">

  {/* Gallery background image */}
  <div
    className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.10]"
    style={{
      backgroundImage:
        "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=75')",
    }}
  />

  {/* Dark overlays */}
  <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#080808]/90 via-[#080808]/85 to-[#080808]/95" />

  {/* Ambient gold lighting */}
  <div className="pointer-events-none absolute -left-32 top-40 -z-10 h-80 w-80 rounded-full bg-[#D4A63A]/[0.06] blur-[120px]" />
  <div className="pointer-events-none absolute -right-32 bottom-20 -z-10 h-80 w-80 rounded-full bg-[#D4A63A]/[0.06] blur-[120px]" />

  <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">

    {/* Section Heading */}
    <div className="mb-12 text-center">
      <p className="text-xs font-bold uppercase tracking-[4px] text-[#D4A63A]">
        Explore Our Collection
      </p>

      <h2 className="mt-4 font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
        Delicious <span className="text-[#D4A63A]">Moments</span>
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
        Explore our collection of authentic biryanis, traditional
        Andhra recipes, and unforgettable culinary inspirations.
      </p>

      {/* Decorative divider */}
      <div className="mx-auto mt-7 flex w-32 items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D4A63A]/70" />
        <span className="h-1.5 w-1.5 rotate-45 border border-[#D4A63A]" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#D4A63A]/70" />
      </div>
    </div>

    {/* Category Filters */}
    <div className="mb-12 flex flex-wrap justify-center gap-3">
      {filters.map((filter) => {
        const isActive = activeFilter === filter

        return (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            aria-pressed={isActive}
            className={`rounded-full border px-5 py-2.5 text-xs font-bold transition-all duration-300 sm:px-7 sm:py-3 sm:text-sm ${
              isActive
                ? 'border-[#D4A63A] bg-[#D4A63A] text-black shadow-lg shadow-[#D4A63A]/20'
                : 'border-white/15 bg-[#14110c]/80 text-neutral-300 hover:border-[#D4A63A]/70 hover:bg-[#D4A63A]/10 hover:text-[#E7C46A]'
            }`}
          >
            {filter}
          </button>
        )
      })}
    </div>

    {/* Photo Count */}
    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
      <div>
        <p className="text-sm font-bold text-white">
          {activeFilter === 'All' ? 'All Photos' : activeFilter}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Our culinary collection
        </p>
      </div>

      <span className="rounded-full border border-[#D4A63A]/30 bg-[#D4A63A]/[0.07] px-4 py-2 text-xs font-bold text-[#D4A63A]">
        {filteredPhotos.length} Photos
      </span>
    </div>

    {/* Gallery Grid */}
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">

      {filteredPhotos.map((photo, index) => (
        <button
          type="button"
          key={photo.id}
          onClick={() => setSelectedPhoto(photo)}
          aria-label={`View ${photo.title}`}
          className={`premium-image gold-edge corner-decoration group relative min-w-0 text-left transition-all duration-500 hover:-translate-y-1.5 ${
            index === 0
              ? 'sm:col-span-2 lg:col-span-1'
              : ''
          }`}
        >
          {/* Image */}
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={photo.image}
              alt={photo.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>

          {/* Image overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-80 transition duration-500 group-hover:opacity-100" />

          {/* Gold hover glow */}
          <div className="pointer-events-none absolute inset-0 bg-[#D4A63A]/[0.03] opacity-0 transition duration-500 group-hover:opacity-100" />

          {/* Image details */}
          <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5">
            <p className="text-[9px] font-bold uppercase tracking-[2px] text-[#E7C46A] sm:text-xs">
              {photo.category}
            </p>

            <h3 className="mt-1 text-sm font-bold text-white sm:mt-2 sm:text-lg">
              {photo.title}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-[#E7C46A] opacity-100 transition-all duration-300 sm:text-xs sm:opacity-0 sm:translate-y-2 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
              Explore Image
              <ArrowRight size={14} />
            </div>
          </div>
        </button>
      ))}
    </div>

    {/* Empty State */}
    {filteredPhotos.length === 0 && (
      <div className="rounded-2xl border border-[#D4A63A]/20 bg-[#111010]/80 px-6 py-20 text-center backdrop-blur-sm">
        <ImageIcon size={36} className="mx-auto text-[#D4A63A]/60" />

        <p className="mt-4 text-base font-semibold text-white">
          No photos found
        </p>

        <p className="mt-2 text-sm text-neutral-400">
          No photos are available in this category.
        </p>
      </div>
    )}
  </div>
</section>



      {/* Image Lightbox */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedPhoto.title}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md sm:p-8"
          onClick={() => setSelectedPhoto(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelectedPhoto(null)
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close image"
            className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-[#111010] p-3 text-white transition hover:border-[#D4A63A] hover:bg-[#D4A63A] hover:text-black sm:right-8 sm:top-8"
          >
            <X size={22} />
          </button>

          {/* Previous Button */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#111010] p-2.5 text-white transition hover:border-[#D4A63A] hover:bg-[#D4A63A] hover:text-black sm:left-8 sm:p-3"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Selected Image */}
          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedPhoto.image}
              alt={selectedPhoto.title}
              className="mx-auto max-h-[75vh] w-full rounded-xl object-contain"
            />

            <div className="mt-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">
                {selectedPhoto.category}
              </p>

              <h2 className="mt-2 font-serif text-xl font-bold sm:text-2xl">
                {selectedPhoto.title}
              </h2>

              <p className="mt-2 text-xs text-neutral-500">
                {selectedIndex + 1} of {filteredPhotos.length}
              </p>
            </div>
          </div>

          {/* Next Button */}
          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#111010] p-2.5 text-white transition hover:border-[#D4A63A] hover:bg-[#D4A63A] hover:text-black sm:right-8 sm:p-3"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <section className="relative overflow-hidden border-t border-white/10 bg-[#321010] px-5 py-16 text-center sm:py-20">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#D4A63A]/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <Camera size={32} className="mx-auto text-[#D4A63A]" />

          <h2 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">
            Hungry Yet?
          </h2>

          <p className="mt-3 text-sm text-neutral-300 sm:text-base">
            Discover your next favourite dish from our delicious menu.
          </p>

          <Link
            to="/menu"
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[#D4A63A] px-8 py-3.5 text-sm font-bold text-black transition duration-300 hover:-translate-y-1 hover:bg-[#E8BD57]"
          >
            Explore Our Menu
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Gallery
