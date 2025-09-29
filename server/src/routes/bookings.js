// server/src/routes/bookings.js
const router = require('express').Router()
const Booking = require('../models/Booking')
const Event = require('../models/Event')
const Closure = require('../models/Closure')
const auth = require('../middleware/auth')
const { buildDaySlots, serviceOfTime, isIsoDate } = require('../utils/slots')

const SLOT_CAP = 7

async function usedInSlot(date, timeSlot) {
  const agg = await Booking.aggregate([
    { $match: { date, timeSlot, status: { $ne: 'CANCELLED' } } },
    { $group: { _id: null, used: { $sum: '$partySize' } } }
  ])
  return agg[0]?.used || 0
}

// PUBLIC: create booking
router.post('/', async (req, res) => {
  try {
    const {
      eventSlug,
      name, phone, email,
      date, timeSlot,
      partyAdults = 0, partyChildren = 0,
      hasAccessibilityNeeds = false, accessibilityNotes = '',
      occasion = '', occasionNotes = '',
      allergies = '', specialNotes = ''
    } = req.body

    if (!name || !phone || !email) return res.status(400).json({ error: 'Missing contact fields' })
    if (!date || !isIsoDate(date)) return res.status(400).json({ error: 'Invalid date' })
    if (!timeSlot) return res.status(400).json({ error: 'Missing time' })

    const daySlots = buildDaySlots(date) // [{time, service}]
    const slotRow = daySlots.find(s => s.time === timeSlot)
    if (!slotRow) return res.status(400).json({ error: 'This time is not available for the selected day.' })

    // Service closure?
    const closed = await Closure.findOne({ date, service: slotRow.service })
    if (closed) return res.status(409).json({ error: `Bookings are closed for ${slotRow.service} on this day.` })

    const adults = Number(partyAdults) || 0
    const children = Number(partyChildren) || 0
    const partySize = adults + children
    if (partySize <= 0) return res.status(400).json({ error: 'Party size must be at least 1' })
    if (partySize > 8)  return res.status(400).json({ error: 'For groups of 9+, please call us to arrange seating.' })

    const used = await usedInSlot(date, timeSlot)
    if (used + partySize > SLOT_CAP) {
      const remaining = Math.max(SLOT_CAP - used, 0)
      return res.status(409).json({ error: `That time is nearly full. Remaining: ${remaining}. Please choose another time.` })
    }

    // Optional event
    let eventId
    if (eventSlug) {
      const ev = await Event.findOne({ slug: eventSlug })
      if (ev) eventId = ev._id
    }

    const service = serviceOfTime(timeSlot)

    const booking = await Booking.create({
      eventId,
      eventSlug: eventSlug || '',
      name, phone, email,
      date, timeSlot, service,
      session: '', // legacy field left empty
      partyAdults: adults,
      partyChildren: children,
      partySize,
      hasAccessibilityNeeds: !!hasAccessibilityNeeds,
      accessibilityNotes: hasAccessibilityNeeds ? String(accessibilityNotes || '') : '',
      occasion: ['birthday','anniversary','graduation','quizNight','other'].includes(occasion) ? occasion : '',
      occasionNotes: String(occasionNotes || ''),
      allergies: String(allergies || ''),
      specialNotes: String(specialNotes || ''),
      status: 'CONFIRMED'
    })

    // Emails (fire-and-forget)
    const { notifyBookingEmails } = require('../services/notify')
    notifyBookingEmails(booking).catch(err => console.warn('[notify] error:', err?.message || err))

    res.status(201).json({ ok: true, booking })
  } catch (e) {
    console.error('Create booking error', e)
    res.status(500).json({ error: 'Server error' })
  }
})

// ADMIN list/update (unchanged)
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