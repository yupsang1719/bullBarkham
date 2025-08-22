const router = require('express').Router()
const jwt = require('jsonwebtoken')

router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ sub: email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '2h' })
    return res.json({ token })
  }
  res.status(401).json({ error: 'Invalid credentials' })
})

module.exports = router
