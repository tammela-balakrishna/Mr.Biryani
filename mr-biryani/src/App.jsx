import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Menu from './pages/Menu'
import About from './pages/About'
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
import Staff from './pages/Staff'
import Admin from './pages/Admin'

function NotFound() {
 return <main className="flex min-h-[70vh] items-center justify-center bg-[#080808] px-5 py-24 text-center"><div className="max-w-xl"><p className="mb-5 text-sm font-bold uppercase tracking-[5px] text-[#D4A63A]">MR. BIRIYANI</p><h1 className="font-serif text-8xl font-bold text-[#D4A63A]">404</h1><h2 className="mt-5 text-3xl font-bold">Page Not Found</h2><p className="mt-4 text-neutral-400">The page you are looking for may have been moved or does not exist.</p><Link to="/" className="mt-9 inline-flex rounded-full bg-[#D4A63A] px-8 py-3.5 font-bold text-black">Back to Home</Link></div></main>
}

// Any of these opens the staff workspace; each tab inside it checks its own permission.
const STAFF_ANY = ['tables.read', 'orders.read', 'billing.read', 'payments.collect', 'reservations.read', 'inventory.read', 'expenses.read', 'reports.sales.read']

function App() {
 const location=useLocation()
 const authPage=['/login','/register'].includes(location.pathname)
 return <div className="flex min-h-screen flex-col bg-[#080808] text-white"><ScrollToTop/>{!authPage&&<Navbar/>}<div key={location.pathname} className="flex-1"><Routes><Route path="/" element={<Home/>}/><Route path="/menu" element={<Menu/>}/><Route path="/about" element={<About/>}/><Route path="/gallery" element={<Gallery/>}/><Route path="/order" element={<Order/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/contact" element={<Contact/>}/><Route path="/branches" element={<Branches/>}/><Route path="/reviews" element={<Reviews/>}/><Route path="/profile" element={<Profile/>}/><Route path="/orders" element={<OrderHistory/>}/><Route path="/reservations" element={<Reservations/>}/><Route path="/staff" element={<ProtectedRoute anyOf={STAFF_ANY}><Staff/></ProtectedRoute>}/><Route path="/admin" element={<ProtectedRoute permission="roles.manage"><Admin/></ProtectedRoute>}/><Route path="*" element={<NotFound/>}/></Routes></div>{!authPage&&<Footer/>}</div>
}

export default App
