import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import Home from './pages/Home'
import Gallery from './pages/Gallery'
import Order from './pages/Order'
import Login from './pages/Login'
import Register from './pages/Register'
import Contact from './pages/Contact'
import Branches from './pages/Branches'
import Reviews from './pages/Reviews'
import Profile from './pages/Profile'
import OrderHistory from './pages/OrderHistory'
import Reservations from './pages/Reservations'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#080808] px-5 py-24 text-center">
      <div className="max-w-xl">
        <p className="mb-5 text-sm font-bold uppercase tracking-[5px] text-[#D4A63A]">MR. BIRIYANI</p>
        <h1 className="font-serif text-8xl font-bold text-[#D4A63A]">404</h1>
        <h2 className="mt-5 text-3xl font-bold">Page Not Found</h2>
        <p className="mt-4 text-neutral-400">The page you are looking for may have been moved or does not exist.</p>
        <Link to="/" className="mt-9 inline-flex rounded-full bg-[#D4A63A] px-8 py-3.5 font-bold text-black">
          Back to Home
        </Link>
      </div>
    </main>
  )
}

function App() {
  const location = useLocation()
  const { status } = useAuth()
  const isAuthed = status === 'authenticated'
  const authPage = ['/login', '/register'].includes(location.pathname)

  return (
    <div className="flex min-h-screen flex-col bg-[#080808] text-white">
      <ScrollToTop />
      
      {!authPage && (
        isAuthed ? <Sidebar /> : <Navbar />
      )}

      <div className={`flex flex-1 flex-col transition-all duration-300 ${!authPage && isAuthed ? 'lg:pl-64 xl:pl-72' : ''}`}>
        <div key={location.pathname} className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Home initialSection="menu" />} />
            <Route path="/about" element={<Home initialSection="about" />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/order" element={<Order />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/staff" element={<Navigate to="/dashboard" replace />} />
            <Route path="/waiter" element={<Navigate to="/dashboard" replace />} />
            <Route path="/captain" element={<Navigate to="/dashboard" replace />} />
            <Route path="/cashier" element={<Navigate to="/dashboard" replace />} />
            <Route path="/manager" element={<Navigate to="/dashboard" replace />} />
            <Route path="/receptionist" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin" element={<ProtectedRoute permission="roles.manage"><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        {!authPage && <Footer />}
      </div>
    </div>
  )
}

export default App
