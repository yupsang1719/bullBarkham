import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

// Which services are open per weekday (0=Sun..6=Sat)
const OPEN_SERVICES_BY_DOW = {
  0: ['lunch'],                 // Sunday: lunch only
  1: [],                        // Monday: closed
  2: ['lunch','dinner'],        // Tue
  3: ['lunch','dinner'],        // Wed
  4: ['lunch','dinner'],        // Thu
  5: ['lunch','dinner'],        // Fri
  6: ['lunch','dinner']         // Sat
}

function dowFromISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export default function Bookings() {
  const [search] = useSearchParams()
  const preselectEvent = search.get('event') || ''

  const [form, setForm] = useState({
    eventSlug: preselectEvent,
    name: '',
    phone: '',
    email: '',
    date: '',
    timeSlot: '',                // NEW: "HH:MM"
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
  const [status, setStatus] = useState(null) // { type, msg }
  const [availability, setAvailability] = useState([]) // [{time, service, remaining, closed}]
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Derived values
  const setField = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }
  const totalGuests = useMemo(() => {
    const a = parseInt(form.partyAdults || '0', 10) || 0
    const c = parseInt(form.partyChildren || '0', 10) || 0
    return a + c
  }, [form.partyAdults, form.partyChildren])

  // Load availability when date changes
  useEffect(() => {
    setAvailability([])
    setForm(f => ({ ...f, timeSlot: '' }))
    if (!form.date) return

    const controller = new AbortController()
    const dow = dowFromISO(form.date)
    const allowedServices = OPEN_SERVICES_BY_DOW[dow] || []

    ;(async () => {
      try {
        const res = await fetch(`${API}/api/availability?date=${encodeURIComponent(form.date)}`, { signal: controller.signal })
        const data = res.ok ? await res.json() : []
        // Filter by services open that day
        const list = Array.isArray(data) ? data.filter(s => allowedServices.includes(s.service)) : []
        setAvailability(list)
      } catch {
        setAvailability([])
      }
    })()

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  const validate = () => {
    const dow = dowFromISO(form.date)
    const allowedServices = OPEN_SERVICES_BY_DOW[dow] || []

    if (form.website) return 'Spam detected.'
    if (!form.name.trim()) return 'Please enter your name.'
    if (!form.phone.trim()) return 'Please enter your phone number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email.'
    if (!form.date) return 'Please choose a date.'
    if (allowedServices.length === 0) return 'We’re closed for food on Mondays. Please choose Tue–Sun.'
    if (!form.timeSlot) return 'Please choose a time.'
    // Ensure chosen time exists in current availability
    const row = availability.find(r => r.time === form.timeSlot)
    if (!row) return 'That time is not available on the selected day.'
    if (row.closed) return 'Bookings are closed for that time.'
    if (row.remaining <= 0) return 'Sorry, that time is fully booked. Please choose another.'
    const party = totalGuests
    if (party <= 0) return 'Please enter adults or children (at least 1).'
    if (party > 8)  return 'For groups of 9 or more, please call us so we can seat you comfortably.'
    return null
  }

  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)
    const err = validate()
    if (err) return setStatus({ type: 'error', msg: err })

    setSending(true)
    try {
      const payload = {
        eventSlug: form.eventSlug || undefined,
        name: form.name,
        phone: form.phone,
        email: form.email,
        date: form.date,
        timeSlot: form.timeSlot,
        partyAdults: parseInt(form.partyAdults || '0', 10) || 0,
        partyChildren: parseInt(form.partyChildren || '0', 10) || 0,
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
        throw new Error(j.error || 'Failed to send booking. Please try another time.')
      }

      setStatus({ type: 'success', msg: 'Thanks! Your booking has been received and confirmed by email.' })
      setForm({
        eventSlug: preselectEvent,
        name: '',
        phone: '',
        email: '',
        date: '',
        timeSlot: '',
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

  const dow = dowFromISO(form.date)
  const isMonday = dow === 1
  const isSunday = dow === 0

  const lunchSlots  = availability.filter(a => a.service === 'lunch')
  const dinnerSlots = availability.filter(a => a.service === 'dinner')

  return (
    <section className="section">
      <div className="container-outer max-w-2xl">
        <h1 className="h1 mb-4">Bookings</h1>

        {isMonday && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2 text-sm">
            Kitchen closed on Mondays — please choose Tuesday to Sunday.
          </div>
        )}

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

          {/* Date & Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="date">Date*</label>
              <input id="date" type="date" name="date" min={todayStr} className="w-full rounded-md border px-3 py-2" value={form.date} onChange={setField} required />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="timeSlot">Time*</label>
              <select
                id="timeSlot"
                name="timeSlot"
                className="w-full rounded-md border px-3 py-2"
                value={form.timeSlot}
                onChange={setField}
                required
                disabled={!form.date || isMonday || availability.length === 0}
              >
                <option value="" disabled>
                  {form.date
                    ? (isMonday ? 'Closed on Mondays' : (availability.length ? 'Choose a time' : 'No times'))
                    : 'Select date first'}
                </option>

                {/* Lunch */}
                {lunchSlots.length > 0 && (
                  <optgroup label={dow === 0 ? 'Sunday Roast (12:00–16:00)' : 'Lunch (12:00–16:00)'}>
                    {lunchSlots.map(s => (
                      <option key={s.time} value={s.time} disabled={s.closed || s.remaining <= 0}>
                        {s.time} {s.closed ? '— Closed' : (s.remaining <= 0 ? '— Full' : `— ${s.remaining} left`)}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Dinner (Tue–Sat) */}
                {dinnerSlots.length > 0 && (
                  <optgroup label="Dinner (18:00–22:00)">
                    {dinnerSlots.map(s => (
                      <option key={s.time} value={s.time} disabled={s.closed || s.remaining <= 0}>
                        {s.time} {s.closed ? '— Closed' : (s.remaining <= 0 ? '— Full' : `— ${s.remaining} left`)}
                      </option>
                    ))}
                  </optgroup>
                )}
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
                placeholder="e.g., wheelchair access, step-free table, assistance dog"
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
                <option value="quizNight">Quiz Night</option>
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

          {/* Summary + note for large groups */}
          <div className="text-sm text-black/70">
            <strong>Total Guests:</strong> {totalGuests || 0}
            <div className="text-xs mt-1">For groups of <strong>9+</strong>, please call us and we’ll arrange the best seating.</div>
          </div>

          <div className="text-sm text-black/70">
            <strong>Alergies</strong>
            <div className="text-xs mt-1">Please inform us of allergies. Some dishes can be prepared vegan — ask your server.</div>
          </div>

          <button
            type="submit"
            className="btn btn-primary disabled:opacity-60"
            disabled={sending || isMonday || !form.date || !form.timeSlot}
          >
            {sending ? 'Sending…' : 'Book Table'}
          </button>
          <p className="text-xs text-black/60">
            We’ll confirm by email. If it’s urgent, please call us at <a href="tel:+01183049428" className="link">+01183049428</a>
          </p>
        </form>
      </div>
    </section>
  )
}