const router = require('express').Router()
const Booking = require('../models/Booking')

const CAPACITY_PER_SESSION = 32
const LABELS = {
  'lunch-1':  'Lunch — 11:45 – 13:45',
  'lunch-2':  'Lunch — 14:00 – 16:00',
  'dinner-1': 'Dinner — 17:45 – 19:45',
  'dinner-2': 'Dinner — 20:00 – 22:00'
}
const OPEN_SESSIONS_BY_DOW = {
  0: ['lunch-1','lunch-2'], // Sun
  1: [],                    // Mon
  2: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  3: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  4: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  5: ['lunch-1','lunch-2','dinner-1','dinner-2'],
  6: ['lunch-1','lunch-2','dinner-1','dinner-2']
}
function isIsoDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s) }
function localDow(iso){ const [y,m,d] = iso.split('-').map(Number); return new Date(y,m-1,d).getDay() }

router.get('/', async (req, res) => {
  const date = String(req.query.date || '')
  if (!isIsoDate(date)) return res.status(400).json({ error: 'Bad date' })

  const dow = localDow(date)
  const allowed = OPEN_SESSIONS_BY_DOW[dow] || []
  if (allowed.length === 0) return res.json([]) // closed day

  const agg = await Booking.aggregate([
    { $match: { date, status: { $ne: 'CANCELLED' }, session: { $in: allowed } } },
    { $group: { _id: '$session', used: { $sum: '$partySize' } } }
  ])
  const usedMap = Object.fromEntries(agg.map(a => [a._id, a.used]))

  const out = allowed.map(id => ({
    session: id,
    service: id.startsWith('lunch') ? 'lunch' : 'dinner',
    label: LABELS[id],
    remaining: Math.max(CAPACITY_PER_SESSION - (usedMap[id] || 0), 0)
  }))

  res.json(out)
})

module.exports = router
