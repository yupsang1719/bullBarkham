const API = import.meta.env.VITE_API_URL || ''

export function getToken() { return localStorage.getItem('bb_admin_token') || '' }
export function setToken(t) { localStorage.setItem('bb_admin_token', t) }
export function clearToken() { localStorage.removeItem('bb_admin_token') }

async function authFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export const adminApi = {
  // NEW: DB-based login
  login: (email, password) =>
    fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(async r => {
      if (!r.ok) {
        const e = await r.json().catch(()=>({error:'Invalid credentials'}))
        throw new Error(e.error || 'Invalid credentials')
      }
      return r.json()
    }),

  // Events (protected)
  listEvents: () => authFetch('/api/events'),
  createEvent: (data) => authFetch('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => authFetch(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => authFetch(`/api/events/${id}`, { method: 'DELETE' }),

  // Bookings (protected)
  listBookings: () => authFetch('/api/bookings'),
  updateBooking: (id, data) => authFetch(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}
