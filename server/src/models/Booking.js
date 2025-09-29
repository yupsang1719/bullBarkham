// server/src/models/Booking.js
const mongoose = require('mongoose')

const BookingSchema = new mongoose.Schema({
  // NEW: time-based booking (30-min slots)
  timeSlot: { type: String, required: true }, // "HH:MM"
  // Keep date as ISO string yyyy-mm-dd
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },

  // Derived service (lunch/dinner) – optional, but handy in admin
  service: { type: String, enum: ['lunch','dinner'], default: undefined },

  // Legacy (sessions). Optional: keep for back-compat while migrating
  session: { type: String, default: '' },

  // Contact
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },

  // Party
  partyAdults: { type: Number, default: 0 },
  partyChildren: { type: Number, default: 0 },
  partySize: { type: Number, required: true },

  // Optional link to event
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  eventSlug: { type: String, default: '' },

  // Flags / notes
  hasAccessibilityNeeds: { type: Boolean, default: false },
  accessibilityNotes: { type: String, default: '' },
  occasion: { type: String, enum: ['', 'birthday', 'anniversary', 'graduation', 'quizNight', 'other'], default: '' },
  occasionNotes: { type: String, default: '' },
  allergies: { type: String, default: '' },
  specialNotes: { type: String, default: '' },

  // Status
  status: { type: String, enum: ['PENDING','CONFIRMED','CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true })

// Useful index for availability lookups
BookingSchema.index({ date: 1, timeSlot: 1, status: 1 })

module.exports = mongoose.model('Booking', BookingSchema)