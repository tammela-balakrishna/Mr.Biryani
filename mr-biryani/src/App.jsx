
import { Routes, Route, Link, useLocation } from 'react-router-dom'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'


import Home from './pages/Home'
import Menu from './pages/Menu'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Order from './pages/Order'
import Login from './pages/Login'
import Register from './pages/Register'
import Contact from './pages/Contact'

function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#080808] px-5 py-24 text-center">
      <div className="max-w-xl animate-fade-up">
        <p className="mb-5 text-sm font-bold uppercase tracking-[5px] text-[#D4A63A]">
          MR. BIRIYANI
        </p>

        <h1 className="font-serif text-8xl font-bold text-[#D4A63A] sm:text-9xl">
          404
        </h1>

        <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">
          Page Not Found
        </h2>

        <p className="mx-auto mt-4 max-w-md leading-7 text-neutral-400">
          The page you are looking for may have been moved or does not exist.
          Let's get you back to something delicious.
        </p>

        <Link
          to="/"
          className="mt-9 inline-flex items-center justify-center rounded-full bg-[#D4A63A] px-8 py-3.5 font-bold text-black transition-all duration-300 hover:-translate-y-1 hover:bg-[#E8BD57] hover:shadow-lg hover:shadow-[#D4A63A]/20"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}

function App() {
  const location = useLocation()

  return (
      
    <div className="flex min-h-screen flex-col bg-[#080808] text-white">
      <ScrollToTop />
      <Navbar />

      <div key={location.pathname} className="flex-1 animate-fade-up">
        <Routes>
           
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/order" element={<Order />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}

export default App
