// client/src/pages/ChristmasBooking.jsx
import { useEffect, useMemo, useState } from 'react'
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const API = import.meta.env.VITE_API_URL || ''

// Try to init Stripe publishable key safely (no throw → no blank screen)
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = PUBLISHABLE_KEY.startsWith('pk_') ? loadStripe(PUBLISHABLE_KEY) : null

// Sittings
const SESSION_LABELS = {
  'xmas-a': '12:00 – 14:00',
  'xmas-b': '14:30 – 16:30'
}

// Prices (override via client .env if you like)
const A_PRICE = Number(import.meta.env.VITE_XMAS_ADULT_PRICE || 95)
const C_PRICE = Number(import.meta.env.VITE_XMAS_CHILD_PRICE || 50)
const DEP_PP  = Number(import.meta.env.VITE_XMAS_DEPOSIT_PER_PERSON || 25)

function Notice({ type = 'info', children }) {
  const cls =
    type === 'error'   ? 'bg-red-50 text-red-800 border-red-200' :
    type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                         'bg-blue-50 text-blue-800 border-blue-200'
  return <div className={`rounded-md px-4 py-3 text-sm border ${cls}`}>{children}</div>
}

/** Step 2: Payment + final booking */
function XmasPaymentStep({ clientSecret, form, onBooked, setStatus }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  async function confirmPaymentAndBook() {
    if (!stripe || !elements) return
    setSubmitting(true)
    setStatus(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      setSubmitting(false)
      return setStatus({ type: 'error', msg: error.message || 'Payment failed. Please try another card.' })
    }

    try {
      const r = await fetch(`${API}/api/christmas/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          session: form.session,
          adults: parseInt(form.adults || '0', 10) || 0,
          children: parseInt(form.children || '0', 10) || 0,
          name: form.name,
          phone: form.phone,
          email: form.email,
          hasAccessibilityNeeds: !!form.hasAccessibilityNeeds,
          accessibilityNotes: form.hasAccessibilityNeeds ? (form.accessibilityNotes || '') : '',
          allergies: form.allergies || '',
          specialNotes: form.specialNotes || ''
        })
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Booking save failed')

      setStatus({ type: 'success', msg: 'Deposit received — your Christmas table is confirmed! 🎄' })
      onBooked(j)
    } catch (e) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-3">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="button"
        className="btn btn-primary mt-2 disabled:opacity-60"
        onClick={confirmPaymentAndBook}
        disabled={submitting}
      >
        {submitting ? 'Confirming…' : 'Confirm Payment & Book'}
      </button>
      <p className="text-xs text-black/60">
        Your deposit is <strong>non-refundable</strong> if you don’t attend. It is credited against your bill on the day.
      </p>
    </div>
  )
}

export default function ChristmasBookingPage() {
  const [availability, setAvailability] = useState([]) // [{session,label,remaining}]
  const [clientSecret, setClientSecret] = useState('')
  const [status, setStatus] = useState(null)
  const [booking, setBooking] = useState(null)
  const [loadingPI, setLoadingPI] = useState(false)

  const [form, setForm] = useState({
    session: '',
    adults: '',
    children: '',
    name: '',
    phone: '',
    email: '',
    hasAccessibilityNeeds: false,
    accessibilityNotes: '',
    allergies: '',
    specialNotes: ''
  })

  const totalGuests = useMemo(() => {
    const a = parseInt(form.adults || '0', 10) || 0
    const c = parseInt(form.children || '0', 10) || 0
    return a + c
  }, [form.adults, form.children])

  const totalPrice = (A_PRICE * (parseInt(form.adults || '0', 10) || 0)) +
                     (C_PRICE * (parseInt(form.children || '0', 10) || 0))
  const depositDue = DEP_PP * totalGuests

  // Availability (fixed Christmas date handled server side)
  useEffect(() => {
    fetch(`${API}/api/christmas/availability`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAvailability(d) : setAvailability([]))
      .catch(() => setAvailability([]))
  }, [])

  function setField(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function startPayment() {
    setStatus(null)

    // Basic validations
    if (!form.session) return setStatus({ type: 'error', msg: 'Please choose a sitting.' })
    if (!form.name.trim()) return setStatus({ type: 'error', msg: 'Please enter your name.' })
    if (!form.phone.trim()) return setStatus({ type: 'error', msg: 'Please enter your phone number.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setStatus({ type: 'error', msg: 'Please enter a valid email.' })
    if (totalGuests <= 0) return setStatus({ type: 'error', msg: 'Please add at least 1 guest.' })

    // Stripe key guard
    if (!stripePromise) {
      return setStatus({
        type: 'error',
        msg: 'Payment setup missing. Please set VITE_STRIPE_PUBLISHABLE_KEY in client/.env and reload.'
      })
    }

    setLoadingPI(true)
    try {
      const r = await fetch(`${API}/api/christmas/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: form.session,
          adults: parseInt(form.adults || '0', 10) || 0,
          children: parseInt(form.children || '0', 10) || 0
        })
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Failed to initialise payment')

      setClientSecret(j.clientSecret) // now render <Elements />
      setStatus({ type: 'info', msg: 'Secure card form ready — please complete payment to reserve.' })
    } catch (e) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setLoadingPI(false)
    }
  }

  const elementsOptions = clientSecret
    ? { clientSecret, appearance: { labels: 'floating' } }
    : null

  return (
    <section className="section">
      <div className="container-outer max-w-2xl">
        <div className="card p-6 grid gap-5">
          <header className="grid gap-2">
            <h1 className="h1">Christmas Day Bookings</h1>
            <p className="text-sm text-black/70">
              Two sittings: <strong>{SESSION_LABELS['xmas-a']} (30 seats)</strong> ·{' '}
              <strong>{SESSION_LABELS['xmas-b']} (32 seats)</strong><br />
              £{A_PRICE} per adult • £{C_PRICE} per child • Deposit £{DEP_PP} per person (charged now).
            </p>
            {!stripePromise && (
              <Notice type="error">
                Stripe publishable key missing/invalid. Add <code>VITE_STRIPE_PUBLISHABLE_KEY</code> to <code>client/.env</code> and restart the dev server.
              </Notice>
            )}
          </header>

          {status && <Notice type={status.type}>{status.msg}</Notice>}

          {!booking && (
            <>
              {/* Session & party size */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Sitting*</label>
                  <select
                    name="session"
                    value={form.session}
                    onChange={setField}
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="" disabled>Choose a sitting</option>
                    {availability.map(s => (
                      <option key={s.session} value={s.session} disabled={s.remaining <= 0}>
                        {SESSION_LABELS[s.session]} — {s.remaining} left
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">Adults*</label>
                    <input
                      type="number"
                      name="adults"
                      min="0"
                      value={form.adults}
                      onChange={setField}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Children*</label>
                    <input
                      type="number"
                      name="children"
                      min="0"
                      value={form.children}
                      onChange={setField}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="text-sm">
                <div><strong>Total guests:</strong> {totalGuests || 0}</div>
                <div>Deposit due now: <strong>£{depositDue.toFixed(2)}</strong></div>
                <div>Menu total on the day: £{totalPrice.toFixed(2)}</div>
              </div>

              {/* Contact */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Name*</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={setField}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Phone*</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={setField}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm mb-1">Email*</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={setField}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasAccessibilityNeeds"
                    checked={form.hasAccessibilityNeeds}
                    onChange={setField}
                  />
                  <span className="text-sm">I have accessibility needs</span>
                </label>
                {form.hasAccessibilityNeeds && (
                  <textarea
                    name="accessibilityNotes"
                    rows="2"
                    value={form.accessibilityNotes}
                    onChange={setField}
                    className="w-full rounded-md border px-3 py-2"
                    placeholder="wheelchair access, step-free table…"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">Allergies</label>
                <textarea
                  name="allergies"
                  rows="2"
                  value={form.allergies}
                  onChange={setField}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Special Notes</label>
                <textarea
                  name="specialNotes"
                  rows="2"
                  value={form.specialNotes}
                  onChange={setField}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>

              {/* Step 1: Create PaymentIntent */}
              {!clientSecret && (
                <button
                  type="button"
                  className="btn btn-primary disabled:opacity-60"
                  onClick={startPayment}
                  disabled={loadingPI}
                >
                  {loadingPI ? 'Preparing secure payment…' : 'Pay Deposit & Reserve'}
                </button>
              )}

              {/* Step 2: Payment element */}
              {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <XmasPaymentStep
                    clientSecret={clientSecret}
                    form={form}
                    setStatus={setStatus}
                    onBooked={(j) => setBooking(j)}
                  />
                </Elements>
              )}
            </>
          )}

          {booking && (
            <div className="text-sm text-black/70">
              <div className="mt-2">Booking ID: <strong>{booking.bookingId}</strong></div>
              <div className="mt-1">We’ve emailed your confirmation. See you on Christmas Day! 🎄</div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}