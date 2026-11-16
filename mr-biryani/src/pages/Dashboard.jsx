import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AdminDashboard from './dashboards/AdminDashboard'
import ManagerDashboard from './dashboards/ManagerDashboard'
import CaptainDashboard from './dashboards/CaptainDashboard'
import WaiterDashboard from './dashboards/WaiterDashboard'
import ReceptionistDashboard from './dashboards/ReceptionistDashboard'
import CashierDashboard from './dashboards/CashierDashboard'
import CustomerDashboard from './dashboards/CustomerDashboard'

// Each role gets its own dashboard. When an account holds several roles, the most senior one is shown.
const BY_ROLE = [
  ['ADMIN', AdminDashboard],
  ['MANAGER', ManagerDashboard],
  ['CAPTAIN', CaptainDashboard],
  ['RECEPTIONIST', ReceptionistDashboard],
  ['CASHIER', CashierDashboard],
  ['WAITER', WaiterDashboard],
]

export default function Dashboard() {
  const { status, roles } = useAuth()
  if (status === 'loading') return <p className="px-6 py-20 text-center text-neutral-400">Loading your dashboard…</p>
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  const match = BY_ROLE.find(([role]) => roles.includes(role))
  const View = match ? match[1] : CustomerDashboard
  return <View />
}
