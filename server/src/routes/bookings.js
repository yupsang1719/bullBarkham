const router = require('express').Router()
const Booking = require('../models/Booking')
const Event = require('../models/Event')
const auth = require('../middleware/auth')
const { isValidSessionId, serviceOf } = require('../utils/time')
const { notifyBookingEmails } = require('../services/notify')

const CAPACITY_PER_SESSION = 32
function isIsoDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s) }

// Business rules: which sessions open by weekday (0=Sun..6=Sat)
const OPEN_SESSIONS_BY_DOW = {
  0: ['lunch-1','lunch-2'], // Sunday (roast only)
  1: [],                    // Monday (closed)
  2: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  3: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  4: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  5: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  6: ['lunch-1','lunch-2','dinner-1','dinner-2']
}
function localDow(iso) {
  const [y,m,d] = iso.split('-').map(Number)
  return new Date(y, m-1, d).getDay()
}

async function seatsUsed(date, session) {
  const agg = await Booking.aggregate([
    { $match: { date, session, status: { $ne: 'CANCELLED' } } },
    { $group: { _id: null, used: { $sum: '$partySize' } } }
  ])
  return agg[0]?.used || 0
}

// PUBLIC create booking (sessions)
router.post('/', async (req, res) => {
  try {
    const {
      eventSlug,
      name, phone, email,
      date,
      session,                 // REQUIRED: "lunch-1" | "dinner-2" ...
      partyAdults = 0, partyChildren = 0,
      hasAccessibilityNeeds = false, accessibilityNotes = '',
      occasion = '', occasionNotes = '',
      allergies = '', specialNotes = ''
    } = req.body

    if (!name || !phone || !email) return res.status(400).json({ error: 'Missing contact fields' })
    if (!date || !isIsoDate(date)) return res.status(400).json({ error: 'Invalid date' })
    if (!session || !isValidSessionId(session)) return res.status(400).json({ error: 'Invalid session' })

    // DOW rules
    const dow = localDow(date)
    const allowed = OPEN_SESSIONS_BY_DOW[dow] || []
    if (allowed.length === 0) {
      return res.status(400).json({ error: 'Kitchen closed on Mondays. Please choose Tue–Sun.' })
    }
    if (!allowed.includes(session)) {
      return res.status(400).json({ error: 'That session is not available on the selected day.' })
    }

    const adults = Number(partyAdults) || 0
    const children = Number(partyChildren) || 0
    const partySize = adults + children
    if (partySize <= 0) return res.status(400).json({ error: 'Party size must be at least 1' })

    const service = serviceOf(session)
    if (!service) return res.status(400).json({ error: 'Invalid session' })

    // Capacity check on {date, session}
    const used = await seatsUsed(date, session)
    if (used + partySize > CAPACITY_PER_SESSION) {
      const remaining = Math.max(CAPACITY_PER_SESSION - used, 0)
      return res.status(409).json({ error: `That session is fully booked. Remaining seats: ${remaining}` })
    }

    // Optional event link
    let eventId
    if (eventSlug) {
      const ev = await Event.findOne({ slug: eventSlug })
      if (ev) eventId = ev._id
    }

    const booking = await Booking.create({
      eventId,
      eventSlug: eventSlug || '',
      name, phone, email,
      date,
      session,
      service,
      partyAdults: adults,
      partyChildren: children,
      partySize,
      groupSize: partySize, // legacy mirror
      hasAccessibilityNeeds: !!hasAccessibilityNeeds,
      accessibilityNotes: hasAccessibilityNeeds ? String(accessibilityNotes || '') : '',
      occasion: ['birthday','anniversary','graduation','other'].includes(occasion) ? occasion : '',
      occasionNotes: String(occasionNotes || ''),
      allergies: String(allergies || ''),
      specialNotes: String(specialNotes || ''),
      status: 'CONFIRMED'
    })

    // fire-and-forget email sends (don’t block booking if SMTP fails)
    notifyBookingEmails(booking).catch(err => console.warn('[notify] error:', err?.message || err))

    res.status(201).json({ ok: true, booking })
  } catch (e) {
    console.error('Create booking error', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ADMIN list + update stay the same
router.get('/', auth, async (_req, res) => {
  const list = await Booking.find().sort({ createdAt: -1 })
  res.json(list)
})

router.patch('/:id', auth, async (req, res) => {
  const allowed = ['PENDING','CONFIRMED','CANCELLED']
  if (req.body.status && !allowed.includes(req.body.status)) return res.status(400).json({ error: 'Bad status' })
  const updated = await Booking.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

module.exports = router
