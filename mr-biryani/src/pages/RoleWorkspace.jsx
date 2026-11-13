import { Link, useNavigate } from 'react-router-dom'
import { getMockSession, logoutMockUser } from '../utils/mockAuth'
import { CalendarDays, ClipboardList, CreditCard, ShieldCheck, Users, Utensils } from 'lucide-react'

const roleDetails = {
  waiter: { title: 'Waiter workspace', summary: 'Assigned tables, permitted order entry, kitchen dispatch and serving status.', icon: Utensils },
  receptionist: { title: 'Receptionist workspace', summary: 'Reservations, availability checks, guest check-in, table allocation and walk-in registration.', icon: CalendarDays },
  captain: { title: 'Captain workspace', summary: 'Floor supervision, waiter assignments, order monitoring and service coordination.', icon: Users },
  cashier: { title: 'Cashier workspace', summary: 'Bill generation, split payments, payment collection, receipts and authorized refund workflows.', icon: CreditCard },
  manager: { title: 'Manager workspace', summary: 'Operational staff responsibilities, branch-scoped analytics, inventory, expenses and staff performance.', icon: ClipboardList },
}

function RoleWorkspace() {
  const navigate = useNavigate()
  const user = getMockSession()
  if (!user || user.role === 'customer' || user.role === 'admin' || !roleDetails[user.role]) {
    return <main className="min-h-[60vh] bg-[#080808] px-5 py-20 text-center text-white"><h1 className="text-2xl font-bold">Workspace unavailable</h1><p className="mt-3 text-neutral-400">Sign in with an authorized staff demo account.</p><Link to="/login" className="mt-6 inline-block text-[#D4A63A]">Go to login</Link></main>
  }
  const detail = roleDetails[user.role]
  const Icon = detail.icon
  const signOut = () => { logoutMockUser(); navigate('/login', { replace: true }) }
  return <main className="min-h-[70vh] bg-[#080808] px-4 py-14 text-white sm:px-6"><section className="mx-auto max-w-3xl rounded-2xl border border-[#D4A63A]/25 bg-[#111010] p-6 sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#D4A63A]/10 text-[#D4A63A]"><Icon size={28}/></div><p className="mt-6 text-xs font-bold uppercase tracking-[3px] text-[#D4A63A]">{user.role} · Prototype</p><h1 className="mt-2 font-serif text-3xl font-bold">{detail.title}</h1><p className="mt-4 leading-7 text-neutral-300">{detail.summary}</p><div className="mt-7 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200"><ShieldCheck className="mb-2" size={18}/>This is a role-aware frontend placeholder. The corresponding operational screens and backend permission enforcement are not implemented yet. Do not use this demo for real restaurant operations.</div><div className="mt-8 flex flex-wrap gap-3"><Link to="/" className="rounded-lg bg-[#D4A63A] px-5 py-3 font-bold text-black">Customer website</Link><button onClick={signOut} className="rounded-lg border border-white/15 px-5 py-3 text-neutral-200">Sign out</button></div></section></main>
}
export default RoleWorkspace
