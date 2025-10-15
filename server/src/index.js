// server/src/index.js
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()

// --- Mount the Stripe RAW webhook FIRST (no body parsing beforehand) ---
const stripeRoutes = require('./routes/stripe')
// This binds: POST /api/stripe/webhook  with express.raw() + handler
app.post('/api/stripe/webhook', ...stripeRoutes.__rawWebhook)

// --- Now normal body parsers & CORS ---
app.use(express.json())
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))

// --- Other routes (JSON-parsed) ---
app.use('/api/closures', require('./routes/closures'))
app.use('/api/availability', require('./routes/availability'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/events', require('./routes/events'))
app.use('/api/stripe', stripeRoutes.router)        // create-checkout-session, finalize (JSON)
app.use('/api/christmas', require('./routes/christmas'))
app.use('/api/auth', require('./routes/auth'))

// --- Start ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Mongo connected')
    const port = process.env.PORT || 4000
    app.listen(port, () => console.log(`API running on http://localhost:${port}`))
  })
  .catch(err => console.error('❌ Mongo error', err))