import {
  ShoppingCart,
  Star,
  Gem,
  Flame,
  MapPin,
  MenuSquare,
  Sparkles
} from 'lucide-react';

/* ---------- DATA & IMAGES ---------- */

const IMG = {
  // Rich, dark, smoky textured background image
  bg: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1920&q=80',
  hero: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=80', 
  dum: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=1200&q=80',
  fry: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=400&q=80',
  special: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80',
  mutton: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=80',
};

const specialties = [
  { name: 'Hyderabadi\nDum Biryani', image: IMG.dum },
  { name: 'Fry-Piece Chicken\nBiryani', image: IMG.fry },
  { name: 'Mr. Biryani\nSpecial', image: IMG.special },
  { name: 'Mutton Biryani', image: IMG.mutton },
];

/* ---------- PAGE COMPONENT ---------- */

export default function Home() {
  return (
    <main 
      className="min-h-screen font-sans relative"
      style={{
        backgroundImage: `url('${IMG.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 
        Global dark overlay to ensure text legibility 
        while letting the background image show through in empty areas 
      */}
      <div className="absolute inset-0 bg-[#110502]/70 z-0"></div>

      {/* Typography Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Montserrat:ital,wght@0,400;0,700;0,800;0,900;1,800&display=swap');
        
        .font-script { font-family: 'Dancing Script', cursive; }
        .font-display { font-family: 'Montserrat', sans-serif; }
      `}</style>

      {/* --- HERO SECTION --- */}
      <section className="relative w-full overflow-hidden text-white pt-6 pb-16 lg:pb-24 z-10 bg-gradient-to-r from-black/90 via-[#3a1508]/60 to-transparent">
        {/* Top left Logo/Text */}
        <div className="absolute top-6 left-6 lg:left-12 flex items-center gap-2 z-20">
          <Sparkles className="text-[#FFC107] w-5 h-5" fill="#FFC107" />
          <span className="font-display font-bold text-xs tracking-[0.2em] uppercase text-white/90">
            House of Andhra Flavours
          </span>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 lg:pt-12 flex flex-col lg:flex-row items-center relative z-10">
          
          {/* Left Text Content */}
          <div className="w-full lg:w-1/2 flex flex-col items-start pt-10 lg:pt-20">
            <div className="flex flex-col items-start leading-none mb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-script text-[#FFC107] text-6xl md:text-8xl drop-shadow-md">
                  Mr.
                </span>
                <span className="font-display font-black italic text-[#FFC107] text-5xl md:text-7xl tracking-wide drop-shadow-md">
                  BIRIYANI
                </span>
              </div>
              <h1 className="font-display font-black text-white text-3xl md:text-[2.75rem] tracking-tight mt-4 uppercase drop-shadow-lg">
                House of Andhra Flavours
              </h1>
            </div>

            <p className="font-display font-bold text-white text-xl md:text-2xl mt-6 drop-shadow-md">
              Authentic. Spicy. Unforgettable.
            </p>
            <p className="font-display text-gray-200 font-medium text-sm md:text-base max-w-md mt-4 leading-relaxed drop-shadow-md">
              Experience the rich taste of Andhra & Hyderabadi Biryani in BTM 1st Stage, Bengaluru.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <button className="bg-[#FFC107] hover:bg-[#ffcd38] text-black font-display font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-[0_4px_14px_0_rgba(255,193,7,0.39)]">
                <ShoppingCart className="w-5 h-5" />
                Order Now
              </button>
              <button className="bg-black/50 border-2 border-[#FFC107] hover:bg-[#FFC107]/20 text-[#FFC107] font-display font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm">
                <MenuSquare className="w-5 h-5" />
                View Menu
              </button>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="w-full lg:w-1/2 mt-12 lg:mt-0 relative flex justify-center lg:justify-end">
            <div className="relative w-[300px] h-[300px] md:w-[500px] md:h-[500px]">
              <div className="absolute inset-0 bg-[#FFC107]/20 rounded-full blur-[100px]"></div>
              <img 
                src={IMG.hero} 
                alt="Delicious Biryani" 
                className="relative w-full h-full object-cover rounded-full shadow-2xl border-4 border-[#3a1508]/50"
                style={{ maskImage: 'radial-gradient(circle, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle, black 65%, transparent 100%)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES BANNER --- */}
      {/* Solid background to break up the sections, exactly as in the UI */}
      <section className="relative bg-[#F8F6F0] w-full py-6 px-4 border-y-4 border-[#1a0500] z-20">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-300">
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Star className="text-[#FFC107] w-10 h-10" fill="#FFC107" />
            <div className="font-display text-[#1a1a1a]">
              <p className="font-bold text-base leading-tight">4.5+ Rating</p>
              <p className="text-sm font-medium">(5k+ Reviews)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Gem className="text-[#FFC107] w-10 h-10" fill="#FFC107" />
            <p className="font-display font-bold text-base text-[#1a1a1a] leading-tight">Generous<br/>Portions</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <Flame className="text-[#FFC107] w-10 h-10" fill="#FFC107" />
            <p className="font-display font-bold text-base text-[#1a1a1a] leading-tight">Authentic<br/>Andhra Taste</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-center px-4 pt-4 md:pt-0">
            <MapPin className="text-[#FFC107] w-10 h-10" fill="#FFC107" />
            <p className="font-display font-bold text-base text-[#1a1a1a] leading-tight">BTM 1st Stage,<br/>Bengaluru</p>
          </div>

        </div>
      </section>

      {/* --- SPECIALTIES GRID --- */}
      {/* Semi-transparent background here lets the smoky background image show through in empty spaces */}
      <section className="relative py-16 px-6 z-10 bg-gradient-to-t from-[#0a0000]/90 to-transparent">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Heading with Lines */}
          <div className="flex items-center justify-center gap-6 mb-12">
            <div className="h-[2px] w-16 md:w-32 bg-gradient-to-l from-[#FFC107] to-transparent"></div>
            <h2 className="font-display font-bold text-white text-2xl md:text-3xl tracking-wide drop-shadow-md">
              Our Specialties
            </h2>
            <div className="h-[2px] w-16 md:w-32 bg-gradient-to-r from-[#FFC107] to-transparent"></div>
          </div>

          {/* Grid Items */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {specialties.map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-full p-1 bg-gradient-to-b from-gray-500/50 to-[#110502]/80 transition-transform duration-300 group-hover:scale-105 shadow-xl">
                  <img 
                    src={item.image} 
                    alt={item.name.replace('\n', ' ')}
                    className="w-full h-full object-cover rounded-full border-[3px] border-[#110502]"
                  />
                </div>
                <h3 className="font-display font-bold text-white text-sm md:text-lg mt-5 whitespace-pre-line group-hover:text-[#FFC107] transition-colors drop-shadow-md">
                  {item.name}
                </h3>
              </div>
            ))}
          </div>

        </div>
      </section>
    </main>
  );
}