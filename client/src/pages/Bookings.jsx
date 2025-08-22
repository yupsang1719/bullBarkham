import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || '' // Vite proxy -> ''

// Labels shown if availability API isn't ready
const SESSION_LABELS = {
  'lunch-1':  'Lunch — 11:45 – 13:45',
  'lunch-2':  'Lunch — 14:00 – 16:00',
  'dinner-1': 'Dinner — 17:45 – 19:45',
  'dinner-2': 'Dinner — 20:00 – 22:00'
}
const CAPACITY_PER_SESSION = 32

export default function Bookings() {
  const [search] = useSearchParams()
  const preselectEvent = search.get('event') || ''

  // form state
  const [form, setForm] = useState({
    eventSlug: preselectEvent,
    name: '',
    phone: '',
    email: '',
    date: '',
    session: '',                 // one of lunch-1, lunch-2, dinner-1, dinner-2
    partyAdults: '',
    partyChildren: '',
    hasAccessibilityNeeds: false,
    accessibilityNotes: '',
    occasion: '',
    occasionNotes: '',
    allergies: '',
    specialNotes: '',
    website: ''                  // honeypot
  })

  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', msg: string }
  const [availability, setAvailability] = useState([]) // [{session, service, label, remaining}]
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // helpers
  const setField = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const totalGuests = useMemo(() => {
    const a = parseInt(form.partyAdults || '0', 10) || 0
    const c = parseInt(form.partyChildren || '0', 10) || 0
    return a + c
  }, [form.partyAdults, form.partyChildren])

  // Load availability whenever date changes
  useEffect(() => {
    setAvailability([])
    setForm(f => ({ ...f, session: '' })) // reset chosen session on date change
    if (!form.date) return

    const controller = new AbortController()
    ;(async () => {
      try {
        // sessions endpoint (service param optional; we’ll show both Lunch & Dinner)
        const url = `${API}/api/availability?date=${encodeURIComponent(form.date)}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('no api')
        const data = await res.json()
        // Expect: [{ session:"dinner-1", service:"dinner", label:"17:45 – 19:45", remaining: 27 }, ...]
        if (Array.isArray(data) && data.every(d => d.session)) {
          setAvailability(data)
        } else {
          // fallback: show all sessions with full remaining
          setAvailability(Object.entries(SESSION_LABELS).map(([id,label]) => (
            { session: id, service: id.startsWith('lunch') ? 'lunch' : 'dinner', label, remaining: CAPACITY_PER_SESSION }
          )))
        }
      } catch {
        // API not ready: fallback
        setAvailability(Object.entries(SESSION_LABELS).map(([id,label]) => (
          { session: id, service: id.startsWith('lunch') ? 'lunch' : 'dinner', label, remaining: CAPACITY_PER_SESSION }
        )))
      }
    })()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  const validate = () => {
    if (form.website) return 'Spam detected.'
    if (!form.name.trim()) return 'Please enter your name.'
    if (!form.phone.trim()) return 'Please enter your phone number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email.'
    if (!form.date) return 'Please choose a date.'
    if (!form.session) return 'Please choose a session.'
    if (totalGuests <= 0) return 'Please enter adults or children (at least 1).'
    const sess = availability.find(s => s.session === form.session)
    if (sess && sess.remaining <= 0) return 'Sorry, that session is fully booked. Please choose another.'
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)
    const err = validate()
    if (err) return setStatus({ type: 'error', msg: err })

    setSending(true)
    try {
      // sessions-only payload (server enforces 32/session)
      const payload = {
        eventSlug: form.eventSlug || undefined,
        name: form.name,
        phone: form.phone,
        email: form.email,
        date: form.date,
        session: form.session,
        partyAdults: parseInt(form.partyAdults || '0', 10) || 0,
        partyChildren: parseInt(form.partyChildren || '0', 10) || 0,
        groupSize: totalGuests, // legacy mirror; harmless if ignored
        hasAccessibilityNeeds: !!form.hasAccessibilityNeeds,
        accessibilityNotes: form.hasAccessibilityNeeds ? form.accessibilityNotes : '',
        occasion: form.occasion || '',
        occasionNotes: form.occasionNotes || '',
        allergies: form.allergies || '',
        specialNotes: form.specialNotes || ''
      }

      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to send booking. Please try again.')
      }

      setStatus({ type: 'success', msg: 'Thanks! Your booking enquiry has been received. We’ll confirm shortly.' })
      setForm({
        eventSlug: preselectEvent,
        name: '',
        phone: '',
        email: '',
        date: '',
        session: '',
        partyAdults: '',
        partyChildren: '',
        hasAccessibilityNeeds: false,
        accessibilityNotes: '',
        occasion: '',
        occasionNotes: '',
        allergies: '',
        specialNotes: '',
        website: ''
      })
      setAvailability([])
    } catch (ex) {
      setStatus({ type: 'error', msg: ex.message })
    } finally {
      setSending(false)
    }
  }

  // Derive grouped lists for display
  const lunchSessions  = availability.filter(a => a.service === 'lunch')
  const dinnerSessions = availability.filter(a => a.service === 'dinner')

  return (
    <section className="section">
      <div className="container-outer max-w-2xl">
        <h1 className="h1 mb-6">Bookings</h1>

        <form onSubmit={submit} className="card p-6 grid gap-4" noValidate>
          {status && (
            <div className={`rounded-md px-4 py-3 text-sm border ${status.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'}`}>
              {status.msg}
            </div>
          )}

          {/* Honeypot */}
          <input type="text" name="website" value={form.website} onChange={setField} className="hidden" tabIndex="-1" autoComplete="off" aria-hidden="true" />

          {/* Optional: event preselect from query */}
          {form.eventSlug && (
            <div>
              <label className="block text-sm mb-1">Event</label>
              <input className="w-full rounded-md border px-3 py-2 bg-black/5" value={form.eventSlug} disabled />
              <p className="text-xs text-black/60 mt-1">Preselected from Events page.</p>
            </div>
          )}

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="name">Name*</label>
              <input id="name" name="name" className="w-full rounded-md border px-3 py-2" placeholder="Your full name" value={form.name} onChange={setField} required />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="phone">Phone*</label>
              <input id="phone" name="phone" className="w-full rounded-md border px-3 py-2" placeholder="+44…" value={form.phone} onChange={setField} required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="email">Email*</label>
              <input id="email" type="email" name="email" className="w-full rounded-md border px-3 py-2" placeholder="you@example.com" value={form.email} onChange={setField} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" htmlFor="partyAdults">Adults*</label>
                <input id="partyAdults" type="number" min="0" name="partyAdults" className="w-full rounded-md border px-3 py-2" placeholder="e.g. 2" value={form.partyAdults} onChange={setField} required />
              </div>
              <div>
                <label className="block text-sm mb-1" htmlFor="partyChildren">Children*</label>
                <input id="partyChildren" type="number" min="0" name="partyChildren" className="w-full rounded-md border px-3 py-2" placeholder="e.g. 1" value={form.partyChildren} onChange={setField} required />
              </div>
            </div>
          </div>

          {/* Date & Session */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="date">Date*</label>
              <input id="date" type="date" name="date" min={todayStr} className="w-full rounded-md border px-3 py-2" value={form.date} onChange={setField} required />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="session">Session*</label>
              <select
                id="session"
                name="session"
                className="w-full rounded-md border px-3 py-2"
                value={form.session}
                onChange={setField}
                required
                disabled={!form.date}
              >
                <option value="" disabled>{form.date ? 'Choose a session' : 'Select date first'}</option>
                <optgroup label="Lunch">
                  {lunchSessions.map(s => (
                    <option key={s.session} value={s.session} disabled={s.remaining <= 0}>
                      {s.label || SESSION_LABELS[s.session]} {s.remaining <= 0 ? '— Full' : `— ${s.remaining} left`}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Dinner">
                  {dinnerSessions.map(s => (
                    <option key={s.session} value={s.session} disabled={s.remaining <= 0}>
                      {s.label || SESSION_LABELS[s.session]} {s.remaining <= 0 ? '— Full' : `— ${s.remaining} left`}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Accessibility */}
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="hasAccessibilityNeeds" checked={form.hasAccessibilityNeeds} onChange={setField} />
              <span className="text-sm">I have accessibility needs</span>
            </label>
            {form.hasAccessibilityNeeds && (
              <textarea
                name="accessibilityNotes"
                rows="2"
                className="w-full rounded-md border px-3 py-2"
                placeholder="e.g., wheelchair access, step‑free table, assistance dog"
                value={form.accessibilityNotes}
                onChange={setField}
              />
            )}
          </div>

          {/* Occasion */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="occasion">Occasion</label>
              <select id="occasion" name="occasion" className="w-full rounded-md border px-3 py-2" value={form.occasion} onChange={setField}>
                <option value="">None</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="graduation">Graduation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="occasionNotes">Occasion Notes</label>
              <input id="occasionNotes" name="occasionNotes" className="w-full rounded-md border px-3 py-2" placeholder="cake, candle, surprise…" value={form.occasionNotes} onChange={setField} />
            </div>
          </div>

          {/* Allergies & Special notes */}
          <div>
            <label className="block text-sm mb-1" htmlFor="allergies">Allergies</label>
            <textarea id="allergies" name="allergies" rows="2" className="w-full rounded-md border px-3 py-2" placeholder="e.g., nuts, shellfish (severe)" value={form.allergies} onChange={setField} />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="specialNotes">Special Notes</label>
            <textarea id="specialNotes" name="specialNotes" rows="3" className="w-full rounded-md border px-3 py-2" placeholder="Any other requests?" value={form.specialNotes} onChange={setField} />
          </div>

          {/* Summary */}
          <div className="text-sm text-black/70">
            <strong>Total Guests:</strong> {totalGuests || 0} / <strong>Capacity:</strong> 32 per session
          </div>

          <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={sending}>
            {sending ? 'Sending…' : 'Send Enquiry'}
          </button>
          <p className="text-xs text-black/60">
            We’ll confirm by phone or email. If it’s urgent, please call us.
          </p>
        </form>
      </div>
    </section>
  )
}
