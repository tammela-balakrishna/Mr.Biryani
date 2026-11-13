
import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../utils/auth'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const currentUser = getCurrentUser()

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

export default ProtectedRoute
