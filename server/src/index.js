require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))

// --- Routes ---

app.use('/api/availability', require('./routes/availability'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/events', require('./routes/events'))
app.use('/api/auth', require('./routes/auth'))      // 👈 NEW DB-based auth

// --- Start ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Mongo connected')
    app.listen(process.env.PORT, () =>
      console.log(`API running on http://localhost:${process.env.PORT}`)
    )
  })
  .catch(err => console.error('❌ Mongo error', err))
