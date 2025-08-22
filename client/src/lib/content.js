// src/lib/content.js
const API = import.meta.env.VITE_API_URL || '' // '' = use Vite proxy in dev

async function safeJson(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getEvents(limit = 50) {
  // Try backend
  try {
    const res = await fetch(`${API}/api/events/upcoming?limit=${limit}`)
    return await safeJson(res)
  } catch {
    // Fallback to local mock data
    const data = await import('../data/events.json')
    return data.default
  }
}

export async function getEvent(slug) {
  try {
    const res = await fetch(`${API}/api/events/${slug}`)
    if (res.status === 404) return null
    return await safeJson(res)
  } catch {
    // Fallback to local
    const events = await getEvents()
    return events.find(e => e.slug === slug) || null
  }
}

export async function getMenu() {
  const data = await import('../data/menu.json')
  return data.default
}

export async function getGallery() {
  const data = await import('../data/gallery.json')
  return data.default
}
