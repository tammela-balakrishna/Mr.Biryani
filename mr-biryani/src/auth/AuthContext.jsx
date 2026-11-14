import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '../api/client'

// Authorization state comes from the server (/auth/session). The UI uses it only to show or hide
// screens; every protected API call is still checked by the backend.
const AuthContext = createContext(null)

const ANONYMOUS = { status: 'anonymous', user: null, roles: [], permissions: [] }

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, roles: [], permissions: [] })

  const loadSession = useCallback(async () => {
    const session = await api.get('/api/v1/auth/session')
    setState({ status: 'authenticated', ...session })
    return session
  }, [])

  const signedOut = useCallback(() => {
    setAccessToken(null)
    setState(ANONYMOUS)
  }, [])

  useEffect(() => {
    setSessionLostHandler(signedOut)
    let alive = true
    ;(async () => {
      const session = await refreshSession()
      if (!alive) return
      if (!session) {
        setState(ANONYMOUS)
        return
      }
      try {
        await loadSession()
      } catch {
        if (alive) setState(ANONYMOUS)
      }
    })()
    return () => {
      alive = false
    }
  }, [loadSession, signedOut])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/v1/auth/login', { email, password })
    setAccessToken(data.accessToken)
    return loadSession()
  }, [loadSession])

  const register = useCallback(async ({ fullName, email, phone, password }) => {
    const data = await api.post('/api/v1/auth/register', { fullName, email, phone: phone || undefined, password })
    setAccessToken(data.accessToken)
    return loadSession()
  }, [loadSession])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      // Even if the server call fails, the local session is cleared below.
    }
    signedOut()
  }, [signedOut])

  const value = useMemo(
    () => ({
      ...state,
      isStaff: state.roles.some((role) => role !== 'CUSTOMER'),
      hasPermission: (key) => state.permissions.includes(key),
      hasAnyPermission: (keys) => keys.some((key) => state.permissions.includes(key)),
      login,
      register,
      logout,
    }),
    [state, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Co-located with the provider on purpose: one module owns the auth state.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
