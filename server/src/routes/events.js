const router = require('express').Router()
const Event = require('../models/Event')
const auth = require('../middleware/auth')

// PUBLIC
router.get('/upcoming', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100)
  const today = new Date().toISOString().slice(0, 10)
  const events = await Event.find({ date: { $gte: today } }).sort({ date: 1, time: 1 }).limit(limit)
  res.json(events)
})
router.get('/:slug', async (req, res) => {
  const e = await Event.findOne({ slug: req.params.slug })
  if (!e) return res.status(404).json({ error: 'Not found' })
  res.json(e)
})

// ADMIN (protected)
router.get('/', auth, async (_req, res) => {
  const q = await Event.find({}).sort({ date: -1, time: -1 })
  res.json(q)
})
router.post('/', auth, async (req, res) => {
  const e = await Event.create(req.body)
  res.status(201).json(e)
})
router.put('/:id', auth, async (req, res) => {
  const e = await Event.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
  if (!e) return res.status(404).json({ error: 'Not found' })
  res.json(e)
})
router.delete('/:id', auth, async (req, res) => {
  const r = await Event.findByIdAndDelete(req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

module.exports = router
