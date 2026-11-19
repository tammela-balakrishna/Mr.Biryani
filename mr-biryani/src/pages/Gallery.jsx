import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  X,
  
} from 'lucide-react'

/* ---------- DATA & IMAGES ---------- */
const IMG = {
  // Rich, dark, smoky textured background image to match the vibe
  bg: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=80',
}

const photos = [
  {
    id: 1,
    title: 'Hyderabadi Dum Biryani',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80', 
  },
  {
    id: 2,
    title: 'Tandoori Chicken Special',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1599487405270-2ea4141d4034?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 3,
    title: 'Restaurant Ambience',
    category: 'Restaurant',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 4,
    title: 'Traditional Curry',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 5,
    title: 'Fry-Piece Chicken Biryani',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 6,
    title: 'Refreshing Beverages',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=1200&q=85',
  },
]

// Updated to match the reference image exactly
const filters = ['All', 'Food', 'Restaurant', 'Events']

export default function Gallery() {
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
    // FIXED: The math here was broken in the previous snippet.
    const previousIndex = (selectedIndex - 1 + filteredPhotos.length) % filteredPhotos.length
    setSelectedPhoto(filteredPhotos[previousIndex])
  }

  const showNext = (event) => {
    event.stopPropagation()
    const nextIndex = (selectedIndex + 1) % filteredPhotos.length
    setSelectedPhoto(filteredPhotos[nextIndex])
  }

  return (
    <main 
      className="min-h-screen relative pt-12 pb-24 px-4 md:px-8 font-sans overflow-x-hidden"
      style={{
        backgroundImage: `url('${IMG.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Global dark overlay to match the image's dark ambiance */}
      <div className="absolute inset-0 bg-[#0a0500]/85 z-0"></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Montserrat', sans-serif; }
      `}</style>

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center pt-8">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-8 font-display">
          <h1 className="font-bold text-[#FFC107] text-4xl md:text-5xl tracking-wide drop-shadow-md mb-2">
            Gallery
          </h1>
          <p className="font-medium text-white text-base md:text-lg drop-shadow-md">
            A Glimpse of Our Food & Ambience
          </p>
        </div>

        {/* FILTER TABS */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 font-display">
          {filters.map((filter) => {
            const isActive = activeFilter === filter
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-md border px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'border-[#FFC107] bg-[#FFC107] text-black shadow-[0_0_15px_rgba(255,193,7,0.3)]'
                    : 'border-neutral-600 bg-black/40 text-neutral-300 hover:border-[#FFC107] hover:text-[#FFC107]'
                }`}
              >
                {filter}
              </button>
            )
          })}
        </div>

        {/* GALLERY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-12">
          {filteredPhotos.map((photo) => (
            <button
              type="button"
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              aria-label={`View ${photo.title}`}
              className="group relative w-full overflow-hidden rounded-xl border-2 border-[#FFC107] transition-transform duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,193,7,0.15)] bg-[#1a0a00]"
            >
              <div className="aspect-[4/3] w-full">
                <img
                  src={photo.image}
                  alt={photo.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        {filteredPhotos.length === 0 && (
          <div className="w-full text-center py-16 font-display border border-[#FFC107]/20 rounded-xl bg-black/40 backdrop-blur-sm mb-12">
            <Camera size={40} className="mx-auto text-[#FFC107]/60 mb-4" />
            <p className="text-xl font-bold text-white mb-2">No photos found</p>
            <p className="text-neutral-400">Check back later for updates in this category.</p>
          </div>
        )}

        {/* BOTTOM CALL TO ACTION */}
        <div className="flex items-center justify-center gap-3 font-display mt-2 mb-4 relative z-20">
          <Camera size={28} className="text-[#FFC107]" fill="#FFC107" strokeWidth={0}/>
          <h2 className="font-bold text-[#FFC107] text-2xl tracking-wide drop-shadow-md">
            Relish the Flavours
          </h2>
        </div>

      </div>

      {/* Decorative Bottom Wave Layer */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[90px] fill-[#FFC107]">
          <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
        </svg>
      </div>

      {/* LIGHTBOX */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md sm:p-8 font-display"
          onClick={() => setSelectedPhoto(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelectedPhoto(null)
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-[#111010] p-3 text-white transition hover:border-[#FFC107] hover:bg-[#FFC107] hover:text-black sm:right-8 sm:top-8"
          >
            <X size={22} />
          </button>

          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#111010] p-2.5 text-white transition hover:border-[#FFC107] hover:bg-[#FFC107] hover:text-black sm:left-8 sm:p-3"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div
            className="w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative border-4 border-[#FFC107] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(255,193,7,0.2)]">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.title}
                className="mx-auto max-h-[75vh] w-full object-contain bg-black"
              />
            </div>
            
            <div className="mt-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[3px] text-[#FFC107]">
                {selectedPhoto.category}
              </p>
              <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                {selectedPhoto.title}
              </h2>
              <p className="mt-2 text-xs text-neutral-400">
                {selectedIndex + 1} of {filteredPhotos.length}
              </p>
            </div>
          </div>

          {filteredPhotos.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-[#111010] p-2.5 text-white transition hover:border-[#FFC107] hover:bg-[#FFC107] hover:text-black sm:right-8 sm:p-3"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

    </main>
  )
}