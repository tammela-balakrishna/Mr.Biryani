// Thin client for the Mr. BIRIYANI API.
// The access token lives in memory only. The refresh token is an HTTP-only cookie that JavaScript cannot read.

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

let accessToken = null
let onSessionLost = () => {}

export const setAccessToken = (token) => {
  accessToken = token
}

export const setSessionLostHandler = (handler) => {
  onSessionLost = handler
}

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let refreshing = null

// Exchanges the refresh cookie for a new access token. Concurrent callers share one request.
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null
          return null
        }
        const body = await res.json()
        accessToken = body.data.accessToken
        return body.data
      })
      .catch(() => {
        accessToken = null
        return null
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

const unwrap = (json) => (json && Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json)

async function send(path, { method = 'GET', body, headers = {}, retried = false } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // One silent refresh and retry when the access token has expired.
  if (res.status === 401 && !retried && accessToken && !path.startsWith('/api/v1/auth/')) {
    const session = await refreshSession()
    if (session) return send(path, { method, body, headers, retried: true })
    onSessionLost()
  }

  if (!res.ok) {
    let error = {}
    try {
      error = (await res.json()).error || {}
    } catch {
      // Non-JSON error body (for example a proxy page); fall back to the status text.
    }
    throw new ApiError(res.status, error.code, error.message || res.statusText, error.details)
  }
  if (res.status === 204) return null
  return unwrap(await res.json())
}

export const api = {
  get: (path) => send(path),
  post: (path, body, headers) => send(path, { method: 'POST', body, headers }),
  patch: (path, body) => send(path, { method: 'PATCH', body }),
  put: (path, body) => send(path, { method: 'PUT', body }),
  del: (path) => send(path, { method: 'DELETE' }),
}

export const newIdempotencyKey = () => globalThis.crypto.randomUUID()
