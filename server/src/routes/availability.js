const router = require('express').Router()
const Booking = require('../models/Booking')
const { SESSIONS, sessionsForService } = require('../utils/time')

const CAPACITY_PER_SESSION = 32

// GET /api/availability?date=YYYY-MM-DD[&service=lunch|dinner]
router.get('/', async (req, res) => {
  const { date, service } = req.query
  if (!date) return res.status(400).json({ error: 'date is required' })

  const sessions = service ? sessionsForService(service) : SESSIONS

  // aggregate used seats per {date,session}
  const agg = await Booking.aggregate([
    { $match: { date, status: { $ne: 'CANCELLED' } } },
    { $group: { _id: '$session', used: { $sum: '$partySize' } } }
  ])
  const usedMap = Object.fromEntries(agg.map(a => [a._id, a.used]))

  const out = sessions.map(s => {
    const used = usedMap[s.id] || 0
    return {
      session: s.id,
      service: s.service,
      label: s.label,
      remaining: Math.max(CAPACITY_PER_SESSION - used, 0)
    }
  })

  res.json(out)
})

module.exports = router
