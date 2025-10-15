// client/src/pages/ChristmasBooking.jsx
import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''

/* ----------------- Canonical sittings ----------------- */
const SITTINGS = [
  { id: 'xmas-early', label: '12:00 – 2:00 PM', capacity: 30 },
  { id: 'xmas-late',  label: '2:30 – 4:30 PM', capacity: 32 },
]

// Accept legacy strings from older availability/URLs and map → canonical id
function normalizeSittingId(input) {
  const s = String(input || '').trim().toLowerCase()
  if (s === 'xmas-early' || s === 'xmas_early') return 'xmas-early'
  if (s === 'xmas-late'  || s === 'xmas_late')  return 'xmas-late'
  if (['12-2','12','12:00','12:00-14:00','12:00 – 14:00','12 – 14','12-00-14-00'].includes(s)) return 'xmas-early'
  if (['2:30-4:30','14:30','14:30-16:30','14:30 – 16:30','2:30 – 4:30','14-30-16-30'].includes(s)) return 'xmas-late'
  return null
}

/* ----------------- Menu ----------------- */
const COURSES = ['starters', 'mains', 'desserts']
const COURSE_LABELS = { starters: 'Starters', mains: 'Mains', desserts: 'Desserts' }

const MENU = {
  starters: [
    "Chicken liver, foie gras & brandy parfait, red onion jelly, toasted brioche",
    "Pan-fried scallops, Loch Duart smoked salmon, maple bacon crumb, celeriac purée",
    "Wild mushroom & truffle arancini, rocket pesto, balsamic",
    "Five-spice crispy confit duck, cucumber, spring onion, pickled ginger, sticky soy",
    "Crispy tempura prawns, pineapple Bombay potato salad, coriander",
  ],
  mains: [
    "Roast bronze turkey, pigs in blankets, sprout & parmesan, duck-fat roast potatoes, bread sauce, red cabbage, pouring gravy, maple parsnips",
    "Slow-braised short rib, truffle mash, maple parsnips, parsley mash, parsnip crisps",
    "Pan-fried line-caught sea bass, garlic prawns, balsamic Mediterranean veg, salsa verde, rocket",
    "Pink carved rack of lamb, dauphinoise potatoes, green beans, black pudding croquette, redcurrant jus",
    "Wild mushroom, tarragon & butternut wellington, roast potatoes, parsnips, red cabbage, hollandaise",
  ],
  desserts: [
    "Stout Christmas pudding, brandy ice cream",
    "Panna cotta, mango, passionfruit meringue",
    "Banoffee cheesecake, caramelised bananas, sticky toffee sauce",
    "Mince pie truffle, Cointreau cream, dark chocolate",
    "Selection of ice creams / sorbets",
    "Christmas cheese board (+£10)",
  ],
}

function numberClamp(n){ const x = Number(n)||0; return x<0?0:Math.floor(x) }

export default function ChristmasBooking() {
  // availability shape: { 'xmas-early': {remaining?:number}, 'xmas-late': {remaining?:number} }
  const [availability, setAvailability] = useState({
    'xmas-early': { remaining: undefined },
    'xmas-late':  { remaining: undefined },
  })
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    session: '',                // always stores canonical id from the select
    partyAdults: '', partyChildren: '',
    allergies: '', occasionNotes: '', specialNotes: '',
    starters: {}, mains: {}, desserts: {}
  })

  /* ------------ Derived counts ------------ */
  const totalGuests = useMemo(() =>
    (Number(form.partyAdults||0) + Number(form.partyChildren||0)), [form.partyAdults, form.partyChildren])

  const totals = useMemo(() => {
    const sum = (obj={}) => Object.values(obj).reduce((s,v)=>s+(Number(v)||0),0)
    return {
      starters: sum(form.starters),
      mains: sum(form.mains),
      desserts: sum(form.desserts),
    }
  }, [form.starters, form.mains, form.desserts])

  const courseOk = {
    starters: totals.starters === totalGuests && totalGuests>0,
    mains:    totals.mains    === totalGuests && totalGuests>0,
    desserts: totals.desserts === totalGuests && totalGuests>0,
  }
  const allOk = totalGuests>0 && courseOk.starters && courseOk.mains && courseOk.desserts && !!form.session

  /* ------------ Load availability (and normalize keys) ------------ */
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/christmas/availability`)
        if (!res.ok) throw new Error('availability not found')
        const raw = await res.json()

        // Build next state with canonical keys
        const next = { 'xmas-early': {}, 'xmas-late': {} }
        for (const [key, val] of Object.entries(raw || {})) {
          const canon = normalizeSittingId(key)
          if (canon) next[canon] = { remaining: Number(val?.remaining) }
        }
        if (!cancel) setAvailability(a => ({ ...a, ...next }))
      } catch {
        // Keep “checking…” placeholders
      }
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------ Helpers ------------ */
  const setField = (e) => {
    const { name, value } = e.target
    setStatus(null)
    setForm(f => ({ ...f, [name]: value }))
  }

  const setCount = (course, item, value) => {
    setStatus(null)
    setForm(f => ({
      ...f,
      [course]: { ...(f[course] || {}), [item]: numberClamp(value) }
    }))
  }

  /* ------------ Submit (create Stripe checkout session) ------------ */
  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)

    // form.session is already canonical because the select uses canonical values
    const sittingId = form.session
    if (!sittingId || !['xmas-early','xmas-late'].includes(sittingId)) {
      return setStatus({ type:'error', msg:'Please choose a valid sitting.' })
    }
    if (!allOk) {
      return setStatus({ type:'error', msg:'Please set party size, choose a sitting, and allocate choices for every course equal to total guests.' })
    }

    // Optional: quick client check vs remaining
    const remaining = availability[sittingId]?.remaining
    if (typeof remaining === 'number' && remaining < totalGuests) {
      return setStatus({ type:'error', msg:`Only ${remaining} seats left in this sitting.` })
    }

    setSending(true)
    try {
      const payload = {
        // the server route expects these names:
        session: sittingId, // canonical id
        partyAdults: Number(form.partyAdults||0),
        partyChildren: Number(form.partyChildren||0),

        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),

        allergies: form.allergies,
        occasionNotes: form.occasionNotes,
        specialNotes: form.specialNotes,

        selections: {
          starters: Object.entries(form.starters).map(([item,count])=>({ item, count:Number(count)||0 })),
          mains:    Object.entries(form.mains).map(([item,count])=>({ item, count:Number(count)||0 })),
          desserts: Object.entries(form.desserts).map(([item,count])=>({ item, count:Number(count)||0 })),
        }
      }

      const res = await fetch(`${API}/api/stripe/create-checkout-session`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(()=>({}))
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to start checkout')
      }

      // Off you go to Stripe Checkout
      window.location.assign(data.url)
    } catch (err) {
      setStatus({ type:'error', msg: err.message })
    } finally {
      setSending(false)
    }
  }

  /* ------------ UI ------------ */
  const selectedId = form.session
  const selectedRemaining = selectedId ? availability[selectedId]?.remaining : undefined
  const selectedCapacity = selectedId ? (SITTINGS.find(s => s.id === selectedId)?.capacity) : undefined

  return (
    <section className="section">
      <div className="container-outer max-w-3xl">
        <h1 className="h1 mb-2">🎄 Christmas Day Booking</h1>
        <p className="text-black/70 mb-4">
          £95 adults • £50 children — Free prosecco (adults) / soft drink (children).
          Pre-order below so the kitchen is ready!
        </p>

        {status && (
          <div className={`border p-3 rounded mb-4 ${status.type==='success'?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={submit} className="card p-6 grid gap-5" noValidate>
          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <input name="name" placeholder="Full name*" className="border rounded px-3 py-2" value={form.name} onChange={setField} required />
            <input name="phone" placeholder="Phone*" className="border rounded px-3 py-2" value={form.phone} onChange={setField} required />
          </div>
          <input type="email" name="email" placeholder="Email*" className="border rounded px-3 py-2" value={form.email} onChange={setField} required />

          {/* Sitting & party */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Sitting*</label>
              <select
                name="session"
                className="border rounded px-3 py-2 w-full"
                value={form.session}
                onChange={setField}
                required
              >
                <option value="">Choose a sitting</option>
                {SITTINGS.map(sit => {
                  const rem = availability[sit.id]?.remaining
                  const isFull = typeof rem === 'number' && rem <= 0
                  return (
                    <option key={sit.id} value={sit.id} disabled={isFull}>
                      {sit.label} — {typeof rem === 'number' ? (isFull ? 'Full' : `${rem} left`) : 'checking…'}
                    </option>
                  )
                })}
              </select>

              {selectedId && (
                <div className="text-xs text-black/60 mt-1">
                  Capacity: {selectedCapacity ?? '—'} · Seats left:{' '}
                  {typeof selectedRemaining === 'number' ? selectedRemaining : 'checking…'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Adults*</label>
                <input name="partyAdults" type="number" min="0" className="border rounded px-3 py-2 w-full" value={form.partyAdults} onChange={setField} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Children*</label>
                <input name="partyChildren" type="number" min="0" className="border rounded px-3 py-2 w-full" value={form.partyChildren} onChange={setField} required />
              </div>
            </div>
          </div>

          {/* Courses */}
          {COURSES.map((course) => (
            <div key={course} className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{COURSE_LABELS[course]}</h3>
                <div className={`text-sm ${courseOk[course] ? 'text-green-700' : 'text-black/70'}`}>
                  {(totals[course] ?? 0)}/{totalGuests} selected
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {(MENU[course] ?? []).map((item) => (
                  <label key={item} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                    <span className="text-sm">{item}</span>
                    <input
                      type="number"
                      min="0"
                      className="w-20 border rounded px-2 py-1 text-right"
                      value={form?.[course]?.[item] ?? ''}
                      onChange={(e) => setCount(course, item, e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>
                ))}
              </div>

              {!courseOk[course] && totalGuests > 0 && (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                  Please allocate exactly {totalGuests} {totalGuests === 1 ? 'dish' : 'dishes'} for {COURSE_LABELS[course]}.
                </div>
              )}
            </div>
          ))}

          {/* Notes */}
          <textarea name="allergies" placeholder="Allergies" className="border rounded px-3 py-2" value={form.allergies} onChange={setField} />
          <textarea name="occasionNotes" placeholder="Occasion (Birthday, Anniversary…)" className="border rounded px-3 py-2" value={form.occasionNotes} onChange={setField} />
          <textarea name="specialNotes" placeholder="Special requests" className="border rounded px-3 py-2" value={form.specialNotes} onChange={setField} />

          <div className="text-sm text-black/70">
            <strong>Total guests:</strong> {totalGuests || 0}
          </div>

          <button type="submit" className="btn btn-primary disabled:opacity-60" disabled={sending || !allOk}>
            {sending ? 'Starting checkout…' : 'Pay Deposit & Confirm'}
          </button>
        </form>
      </div>
    </section>
  )
}