// server/src/routes/availability.js
const router = require('express').Router()
const Booking = require('../models/Booking')
const Closure = require('../models/Closure')
const { buildDaySlots, isIsoDate } = require('../utils/slots')

// Cap per half-hour slot (online). We keep walk-in buffer outside online cap.
const SLOT_CAP = 7

router.get('/', async (req, res) => {
  try {
    const date = String(req.query.date || '')
    if (!isIsoDate(date)) return res.status(400).json({ error: 'Bad date' })

    // Build 30-min slots for this date
    const slots = buildDaySlots(date) // [{time, service}]
    if (slots.length === 0) return res.json([]) // Monday → []

    // Used seats per timeSlot
    const agg = await Booking.aggregate([
      { $match: { date, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$timeSlot', used: { $sum: '$partySize' } } }
    ])
    const usedMap = Object.fromEntries(agg.map(r => [r._id, r.used]))

    // Closures by service for this date
    const dayClosures = await Closure.find({ date })
    const closedServices = new Set(dayClosures.map(c => c.service))

    // Build output
    const out = slots.map(({ time, service }) => {
      const closed = closedServices.has(service)
      const remaining = closed ? 0 : Math.max(SLOT_CAP - (usedMap[time] || 0), 0)
      return { time, service, remaining, closed }
    })

    res.json(out)
  } catch (e) {
    console.error('availability error', e)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router