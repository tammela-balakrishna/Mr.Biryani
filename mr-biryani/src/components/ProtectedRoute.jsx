import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Route guard for usability only. The API rejects anything the user is not allowed to do.
function ProtectedRoute({ children, permission, anyOf }) {
  const location = useLocation()
  const { status, hasPermission, hasAnyPermission } = useAuth()

  if (status === 'loading') {
    return <p className="flex min-h-[60vh] items-center justify-center text-neutral-400">Loading…</p>
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  const allowed = (!permission || hasPermission(permission)) && (!anyOf || hasAnyPermission(anyOf))
  if (!allowed) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#080808] px-5 py-20 text-center text-white">
        <div>
          <h1 className="font-serif text-3xl font-bold">Access <span className="text-[#D4A63A]">denied</span></h1>
          <p className="mt-4 text-neutral-400">Your account does not have permission to open this page.</p>
        </div>
      </main>
    )
  }
  return children
}

export default ProtectedRoute
