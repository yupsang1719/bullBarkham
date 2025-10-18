const API = import.meta.env.VITE_API_URL || ''

export const xmasAdminApi = {
  availability: async () => {
    const r = await fetch(`${API}/api/christmas/availability`)
    if (!r.ok) throw new Error('availability failed')
    return r.json()
  },
  listBookings: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const r = await fetch(`${API}/api/christmas/admin/bookings${qs ? `?${qs}` : ''}`)
    if (!r.ok) throw new Error('list failed')
    return r.json()
  },
  createBooking: async (payload) => {
    const r = await fetch(`${API}/api/christmas/admin/bookings`, {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload)
    })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok) throw new Error(j.error || 'create failed')
    return j
  },
  updateBooking: async (id, payload) => {
    const r = await fetch(`${API}/api/christmas/admin/bookings/${id}`, {
      method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload)
    })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok) throw new Error(j.error || 'update failed')
    return j
  },
  listClosures: async () => {
    const r = await fetch(`${API}/api/christmas/admin/closures`)
    if (!r.ok) throw new Error('closures failed')
    return r.json()
  },
  closeSitting: async (sittingId, reason='') => {
    const r = await fetch(`${API}/api/christmas/admin/closures`, {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ sittingId, reason })
    })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok) throw new Error(j.error || 'close failed')
    return j
  },
  reopenClosure: async (id) => {
    const r = await fetch(`${API}/api/christmas/admin/closures/${id}`, { method: 'DELETE' })
    const j = await r.json().catch(()=> ({}))
    if (!r.ok) throw new Error(j.error || 'reopen failed')
    return j
  }
}