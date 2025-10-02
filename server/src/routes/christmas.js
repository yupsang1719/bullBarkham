// server/src/routes/christmas.js
const router = require('express').Router()
const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const SpecialBooking = require('../models/SpecialBooking')
const {
  getFixedDate, sessionsForChristmas, SESSION_LABELS,
  PRICE_ADULT, PRICE_CHILD, DEPOSIT_PP
} = require('../utils/christmas')

// GET /api/christmas/availability
router.get('/availability', async (_req, res) => {
  const date = getFixedDate()
  const sessions = sessionsForChristmas()
  const rows = await SpecialBooking.find({ type: 'christmas', date, status: { $ne: 'CANCELLED' } })
  const usedBy = rows.reduce((m,b)=>((m[b.session]=(m[b.session]||0)+(b.totalGuests||0)),m),{})
  res.json(sessions.map(s => ({
    session: s.id,
    label: s.label,
    remaining: Math.max((s.capacity||0) - (usedBy[s.id]||0), 0)
  })))
})

// POST /api/christmas/create-intent
// body: { session, adults, children }
router.post('/create-intent', async (req, res) => {
  try {
    const { session, adults=0, children=0 } = req.body
    const date = getFixedDate()

    const sessions = sessionsForChristmas()
    const sess = sessions.find(s => s.id === session)
    if (!sess) return res.status(400).json({ error: 'Invalid session' })

    const A = Number(adults)||0, C = Number(children)||0, total = A + C
    if (total <= 0) return res.status(400).json({ error: 'Party must be at least 1' })

    const agg = await SpecialBooking.aggregate([
      { $match: { type:'christmas', date, session, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, used: { $sum: '$totalGuests' } } }
    ])
    const used = agg[0]?.used || 0
    if (used + total > sess.capacity) {
      return res.status(409).json({ error: `Session full. Remaining seats: ${Math.max(sess.capacity-used,0)}` })
    }

    const amount = Math.round(DEPOSIT_PP * total * 100) // GBP pence
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      metadata: { type: 'christmas', date, session, adults:String(A), children:String(C) }
    })

    res.json({ clientSecret: pi.client_secret })
  } catch (e) {
    console.error('create-intent', e)
    res.status(500).json({ error: 'Payment init failed' })
  }
})

// POST /api/christmas/book
// body: { session, adults, children, name, phone, email, notes..., paymentIntentId }
router.post('/book', async (req, res) => {
  try {
    const {
      name, phone, email,
      session, adults=0, children=0,
      hasAccessibilityNeeds=false, accessibilityNotes='',
      allergies='', specialNotes='',
      paymentIntentId
    } = req.body

    if (!name || !phone || !email) return res.status(400).json({ error: 'Missing contact' })
    if (!paymentIntentId) return res.status(400).json({ error: 'Missing paymentIntentId' })

    const date = getFixedDate()
    const sessions = sessionsForChristmas()
    const sess = sessions.find(s => s.id === session)
    if (!sess) return res.status(400).json({ error: 'Invalid session' })

    const A = Number(adults)||0, C = Number(children)||0, total = A + C
    if (total <= 0) return res.status(400).json({ error: 'Party must be at least 1' })

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (!pi || pi.status === 'canceled') return res.status(400).json({ error: 'Payment not valid' })
    const expected = Math.round(DEPOSIT_PP * total * 100)
    if (pi.amount !== expected) return res.status(400).json({ error: 'Payment amount mismatch' })
    if (!['succeeded','requires_capture','processing'].includes(pi.status)) {
      return res.status(400).json({ error: `Payment not completed (${pi.status})` })
    }

    // final capacity check
    const agg = await SpecialBooking.aggregate([
      { $match: { type:'christmas', date, session, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, used: { $sum: '$totalGuests' } } }
    ])
    const used = agg[0]?.used || 0
    if (used + total > sess.capacity) {
      return res.status(409).json({ error: 'Session just became full. We will refund your deposit.' })
    }

    const doc = await SpecialBooking.create({
      type: 'christmas',
      name, phone, email,
      date, session,
      adults: A, children: C, totalGuests: total,
      hasAccessibilityNeeds: !!hasAccessibilityNeeds,
      accessibilityNotes: hasAccessibilityNeeds ? String(accessibilityNotes||'') : '',
      allergies: String(allergies||''), specialNotes: String(specialNotes||''),
      priceAdult: PRICE_ADULT, priceChild: PRICE_CHILD, depositPerPerson: DEPOSIT_PP,
      paymentIntentId: pi.id, paymentStatus: pi.status,
      status: 'CONFIRMED'
    })

    res.status(201).json({ ok:true, bookingId: doc._id })
  } catch (e) {
    console.error('book', e)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router