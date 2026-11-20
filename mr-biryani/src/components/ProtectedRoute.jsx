import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Route guard for usability. Redirects immediately if the user lacks the required operation permission.
function ProtectedRoute({ children, permission, anyOf, redirectTo }) {
  const location = useLocation()
  const { status, hasPermission, hasAnyPermission, isStaff } = useAuth()

  if (status === 'loading') {
    return <p className="flex min-h-[60vh] items-center justify-center text-neutral-400">Loading…</p>
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  const allowed = (!permission || hasPermission(permission)) && (!anyOf || hasAnyPermission(anyOf))
  if (!allowed) {
    return <Navigate to={redirectTo || (isStaff ? '/dashboard' : '/')} replace />
  }
  return children
}

export default ProtectedRoute
