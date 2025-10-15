// server/src/routes/christmas.js
const router = require('express').Router()
const XmasBooking = require('../models/XmasBooking')
const PendingXmas = require('../models/PendingXmas')

// Keep these exactly the same as stripe.js uses
const XMAS_EVENT_KEY = process.env.XMAS_EVENT_KEY || 'christmas-2025'
const XMAS_DATE = process.env.XMAS_DATE || '2025-12-25'
const SITTINGS = {
  'xmas-early': { label: '12:00 – 2:00 PM', capacity: 30 },
  'xmas-late':  { label: '2:30 – 4:30 PM', capacity: 32 }
}

// --- GET availability (used by the booking page) ---
router.get('/availability', async (req, res) => {
  try {
    // sum confirmed seats per sitting
    const agg = await XmasBooking.aggregate([
      { $match: { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$sittingId', used: { $sum: '$partySize' } } }
    ])

    const usedById = Object.fromEntries(agg.map(x => [x._id, x.used]))
    const out = {}
    for (const [id, def] of Object.entries(SITTINGS)) {
      const cap = def.capacity
      const used = usedById[id] || 0
      out[id] = { label: def.label, capacity: cap, remaining: Math.max(cap - used, 0) }
    }
    return res.json(out)
  } catch (e) {
    console.error('[christmas] availability error', e)
    res.status(500).json({ error: 'availability failed' })
  }
})

/*
Success page helper:
Returns a compact state for a pending id so the UI knows what to show.

States:
- PENDING          -> payment not completed yet (or not seen)
- PAID_AWAITING    -> payment completed, booking not yet written
- PAID_CONFIRMED   -> payment completed and booking exists
- CANCELLED        -> reservation cancelled (e.g., capacity issue)
- UNKNOWN          -> pid not found
*/
router.get('/pending/:pid', async (req, res) => {
  try {
    const { pid } = req.params
    const p = await PendingXmas.findById(pid).lean()
    if (!p) return res.status(404).json({ state: 'UNKNOWN' })

    if (p.status === 'CANCELLED') return res.json({ state: 'CANCELLED' })
    if (p.status === 'PENDING')   return res.json({ state: 'PENDING' })

    // If webhook has marked this as PAID but booking creation lagged, we’ll say PAID_AWAITING.
    // Otherwise, if we can find a booking that matches, mark PAID_CONFIRMED.
    if (p.status === 'PAID') {
      const exists = await XmasBooking.exists({
        eventKey: XMAS_EVENT_KEY,
        date: p.date,
        sittingId: p.sittingId,
        email: p.email,
        partySize: p.partySize,
        status: { $ne: 'CANCELLED' }
      })
      return res.json({ state: exists ? 'PAID_CONFIRMED' : 'PAID_AWAITING' })
    }

    // Fallback
    return res.json({ state: 'PENDING' })
  } catch (e) {
    console.error('[christmas] pending status error', e)
    res.status(500).json({ state: 'UNKNOWN' })
  }
})

/*
Dev-only “nudge” endpoint the success page can call once if the webhook is slow.
Only attempts finalize if the pending row is already PAID (i.e., webhook marked it).
If a booking already exists, it’s a no-op.
*/
router.post('/finalize/:pid', async (req, res) => {
  try {
    const { pid } = req.params
    const p = await PendingXmas.findById(pid)
    if (!p) return res.status(404).json({ ok: false, error: 'not found' })
    if (p.status !== 'PAID') return res.status(409).json({ ok: false, error: 'not paid yet' })

    const already = await XmasBooking.exists({
      eventKey: XMAS_EVENT_KEY,
      date: p.date,
      sittingId: p.sittingId,
      email: p.email,
      partySize: p.partySize,
      status: { $ne: 'CANCELLED' }
    })
    if (already) return res.json({ ok: true })

    // Write booking now
    await XmasBooking.create({
      eventKey: XMAS_EVENT_KEY,
      date: p.date,
      sittingId: p.sittingId,
      sittingLabel: p.sittingLabel,
      capAtCreate: p.capAtCreate,

      name: p.name,
      phone: p.phone,
      email: p.email,

      partyAdults: p.partyAdults,
      partyChildren: p.partyChildren,
      partySize: p.partySize,

      selections: p.selections,
      allergies: p.allergies,
      occasionNotes: p.occasionNotes,
      specialNotes: p.specialNotes,

      status: 'CONFIRMED'
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('[christmas] finalize error', e)
    res.status(500).json({ ok: false, error: 'finalize failed' })
  }
})

module.exports = router