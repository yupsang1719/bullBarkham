// server/src/routes/closures.js
const router = require('express').Router()
const Closure = require('../models/Closure')
const auth = require('../middleware/auth')

/**
 * GET /api/closures?date=YYYY-MM-DD
 * Returns all closures for a date (if no date, returns all)
 */
router.get('/', auth, async (req, res) => {
  const { date } = req.query
  const q = date ? { date } : {}
  const rows = await Closure.find(q).sort({ date: 1, service: 1 })
  res.json(rows)
})

/**
 * POST /api/closures
 * body: { date: YYYY-MM-DD, service: 'lunch'|'dinner', reason?: string }
 */
router.post('/', auth, async (req, res) => {
  const { date, service, reason = '' } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date' })
  if (!['lunch','dinner'].includes(service)) return res.status(400).json({ error: 'Invalid service' })
  try {
    const row = await Closure.create({ date, service, reason })
    res.status(201).json(row)
  } catch (e) {
    // handle unique constraint gracefully
    if (e.code === 11000) return res.status(200).json(await Closure.findOne({ date, service }))
    console.error('Create closure error', e)
    res.status(500).json({ error: 'Server error' })
  }
})

/**
 * DELETE /api/closures/:id
 */
router.delete('/:id', auth, async (req, res) => {
  const deleted = await Closure.findByIdAndDelete(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

module.exports = router