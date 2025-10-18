// client/src/pages/ChristmasBooking.jsx
import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_API_URL || ''
const depositPerGuest = Number(import.meta.env.VITE_XMAS_DEPOSIT_GBP || 25)

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

/* ========================================================= */

export default function ChristmasBooking() {
  const [availability, setAvailability] = useState({
    'xmas-early': { remaining: undefined },
    'xmas-late':  { remaining: undefined },
  })
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    session: '',
    partyAdults: '', partyChildren: '',
    allergies: '', occasionNotes: '', specialNotes: '',
    starters: {}, mains: {}, desserts: {}
  })

  /* ------------ Derived counts ------------ */
  const totalGuests = useMemo(
    () => (Number(form.partyAdults||0) + Number(form.partyChildren||0)),
    [form.partyAdults, form.partyChildren]
  )
  const totals = useMemo(() => {
    const sum = (obj={}) => Object.values(obj).reduce((s,v)=>s+(Number(v)||0),0)
    return {
      starters: sum(form.starters),
      mains: sum(form.mains),
      desserts: sum(form.desserts),
    }
  }, [form.starters, form.mains, form.desserts])

  // Pre-order rules: mains required; starters/desserts optional up to party size
  const mainsOk     = totalGuests > 0 && totals.mains === totalGuests
  const startersOk  = totals.starters <= totalGuests
  const dessertsOk  = totals.desserts <= totalGuests
  const allOk = totalGuests>0 && !!form.session && mainsOk && startersOk && dessertsOk

  /* ------------ Load availability ------------ */
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/christmas/availability`)
        if (!res.ok) throw new Error('availability not found')
        const raw = await res.json()
        const next = { 'xmas-early': {}, 'xmas-late': {} }
        for (const [key, val] of Object.entries(raw || {})) {
          const canon = normalizeSittingId(key)
          if (canon) next[canon] = { remaining: Number(val?.remaining) }
        }
        if (!cancel) setAvailability(a => ({ ...a, ...next }))
      } catch {}
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

  /* ------------ Submit ------------ */
  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)

    const sittingId = form.session
    if (!sittingId || !['xmas-early','xmas-late'].includes(sittingId)) {
      return setStatus({ type:'error', msg:'Please choose a valid sitting.' })
    }
    if (totalGuests <= 0) {
      return setStatus({ type:'error', msg:'Party size must be at least 1.' })
    }
    if (!mainsOk) {
      return setStatus({ type:'error', msg:`Please select exactly ${totalGuests} mains (1 per guest).` })
    }
    if (!startersOk || !dessertsOk) {
      return setStatus({ type:'error', msg:'Starters and desserts cannot exceed the number of guests.' })
    }

    const remaining = availability[sittingId]?.remaining
    if (typeof remaining === 'number' && remaining < totalGuests) {
      return setStatus({ type:'error', msg:`Only ${remaining} seats left in this sitting.` })
    }

    setSending(true)
    try {
      const payload = {
        session: sittingId,
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
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Failed to start checkout')
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
  const depositTotal = totalGuests * depositPerGuest

  return (
    <section className="relative">
      {/* Festive background + snow (CSS in index.css) */}
      <div className="xmas-snow pointer-events-none" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-red-50 via-white to-emerald-50" />
      <div className="container-outer max-w-3xl">
        {/* Banner */}
        <div className="relative mt-8 mb-6 rounded-xl border border-red-200 bg-white/80 backdrop-blur p-5 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-900 flex items-center gap-3">
            <span>🎄 Christmas Day Booking</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-xs px-2 py-1 border border-emerald-200">
              Pre-order required
            </span>
          </h1>
          <p className="text-sm sm:text-base text-black/70 mt-2">
            £95 adults • £50 children — Free prosecco for adults, soft drink for children.
            Please complete your menu choices now. <strong>Mains are required (1 per guest)</strong>;
            starters & desserts are optional. Orders can’t be taken on Christmas Day.
          </p>
        </div>

        {status && (
          <div className={`border p-3 rounded mb-6 ${status.type==='success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'}`}>
            {status.msg}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-6">
          {/* Contact */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <h2 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
              <span>👤 Your Details</span>
              <span className="text-xs text-black/50">(confirmation by email)</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input name="name" placeholder="Full name*" className="border rounded px-3 py-2" value={form.name} onChange={setField} required />
              <input name="phone" placeholder="Phone*" className="border rounded px-3 py-2" value={form.phone} onChange={setField} required />
            </div>
            <input type="email" name="email" placeholder="Email*" className="border rounded px-3 py-2 mt-3" value={form.email} onChange={setField} required />
          </div>

          {/* Sitting & party */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <h2 className="font-semibold text-emerald-900 mb-3">🕒 Sitting & Party</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Sitting*</label>
                <select name="session" className="border rounded px-3 py-2 w-full" value={form.session} onChange={setField} required>
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
                {form.session && (
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

            {/* Gift tag: deposit preview */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-1">
                🎁 Deposit: £{depositPerGuest} per guest (redeemed; non-refundable if you don’t attend)
              </span>
              <span className="xmas-tag inline-flex items-center gap-2">
                <span className="text-xs">Total deposit</span>
                <strong className="tabular-nums">£{(depositTotal || 0).toFixed(2)}</strong>
              </span>
            </div>
          </div>

          {/* Courses */}
          <CourseCard
            tone="emerald"
            title="Starters (optional)"
            subtitle={`Choose up to ${totalGuests || 0}`}
            countText={`${totals.starters}/${totalGuests || 0} selected`}
            ok={startersOk}
            limit={totalGuests}
            items={MENU.starters}
            values={form.starters}
            onChange={(item, v) => setCount('starters', item, v)}
            extraHint="You may leave this section blank."
          />

          <CourseCard
            tone="red"
            title="Mains (required — exactly 1 per guest)"
            subtitle={`Choose exactly ${totalGuests || 0}`}
            countText={`${totals.mains}/${totalGuests || 0} selected`}
            ok={mainsOk}
            limit={totalGuests}
            exact
            items={MENU.mains}
            values={form.mains}
            onChange={(item, v) => setCount('mains', item, v)}
          />

          <CourseCard
            tone="emerald"
            title="Desserts (optional)"
            subtitle={`Choose up to ${totalGuests || 0}`}
            countText={`${totals.desserts}/${totalGuests || 0} selected`}
            ok={dessertsOk}
            limit={totalGuests}
            items={MENU.desserts}
            values={form.desserts}
            onChange={(item, v) => setCount('desserts', item, v)}
            extraHint="You may leave this section blank."
          />

          {/* Notes */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <h2 className="font-semibold text-emerald-900 mb-3">📝 Notes</h2>
            <div className="grid gap-3">
              <textarea name="allergies" placeholder="Allergies" className="border rounded px-3 py-2" value={form.allergies} onChange={setField} />
              <textarea name="occasionNotes" placeholder="Occasion (Birthday, Anniversary…)" className="border rounded px-3 py-2" value={form.occasionNotes} onChange={setField} />
              <textarea name="specialNotes" placeholder="Special requests" className="border rounded px-3 py-2" value={form.specialNotes} onChange={setField} />
              <div className="text-sm text-black/70">
                <strong>Total guests:</strong> {totalGuests || 0}
              </div>
            </div>
          </div>

          {/* Footer / Submit */}
          <div className="rounded-xl border bg-white shadow-sm p-5">
            <p className="text-sm text-black/70 mb-3">
              By continuing you’ll pay a deposit and receive a confirmation email. Menu changes after booking depend on availability — please email or call us early.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-white bg-gradient-to-r from-red-600 to-emerald-600 hover:opacity-90 disabled:opacity-60"
              disabled={sending || !allOk}
              title={!allOk ? 'Please complete your pre-order (mains required)' : 'Pay deposit & confirm'}
            >
              {sending ? 'Starting checkout…' : 'Pay Deposit & Confirm'}
              <span>🎅</span>
            </button>
          </div>
        </form>

        <div className="text-center text-2xl my-6 select-none">❄️ ❄️ ❄️</div>
      </div>
    </section>
  )
}

/* ------------- Small festive course card component ------------- */
function CourseCard({
  tone = 'emerald',
  title,
  subtitle,
  countText,
  ok,
  limit,
  exact = false,
  items = [],
  values = {},
  onChange = () => {},
  extraHint = ''
}) {
  const toneBorder = tone === 'red' ? 'border-red-200' : 'border-emerald-200'
  const toneHeader = tone === 'red' ? 'text-red-800' : 'text-emerald-800'
  const selected = Object.values(values).reduce((s,v)=>s+(Number(v)||0),0)

  return (
    <div className={`rounded-xl border bg-white shadow-sm p-5 ${toneBorder}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className={`font-semibold ${toneHeader}`}>{title}</h2>
          <div className="text-xs text-black/60">{subtitle}</div>
        </div>
        <div className={`text-sm ${ok ? 'text-emerald-700' : 'text-black/70'}`}>{countText}</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <label key={item} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
            <span className="text-sm">{item}</span>
            <input
              type="number"
              min="0"
              className="w-20 border rounded px-2 py-1 text-right"
              value={values?.[item] ?? ''}
              onChange={(e) => onChange(item, e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </label>
        ))}
      </div>

      {/* Inline guidance/errors */}
      {!ok && exact && limit > 0 && (
        <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2">
          Please allocate exactly {limit} {limit === 1 ? 'main' : 'mains'} (1 per guest).
        </div>
      )}
      {!ok && !exact && selected > limit && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
          You can select at most {limit} for this course.
        </div>
      )}
      {extraHint && (
        <div className="text-xs text-black/60 mt-2">{extraHint}</div>
      )}
    </div>
  )
}