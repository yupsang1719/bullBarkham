const router = require('express').Router()
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// POST /api/auth/register  (temporary open; lock down after first admin)
router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  const user = new User({ email: email.toLowerCase(), name: name || '', role: role || 'admin' })
  await user.setPassword(password)
  await user.save()

  res.status(201).json({ ok: true })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await user.verifyPassword(password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  )
  res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } })
})

module.exports = router
