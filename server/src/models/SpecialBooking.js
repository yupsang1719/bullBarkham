const mongoose = require('mongoose')

const SpecialBookingSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true }, // 'christmas'
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },

  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  session: { type: String, enum: ['xmas-a','xmas-b'], required: true },

  adults: { type: Number, default: 0 },
  children: { type: Number, default: 0 },
  totalGuests: { type: Number, required: true },

  hasAccessibilityNeeds: { type: Boolean, default: false },
  accessibilityNotes: { type: String, default: '' },
  allergies: { type: String, default: '' },
  specialNotes: { type: String, default: '' },

  priceAdult: { type: Number, required: true },
  priceChild: { type: Number, required: true },
  depositPerPerson: { type: Number, required: true },

  paymentIntentId: { type: String, required: true },
  paymentStatus: { type: String, default: 'requires_payment_method' },

  status: { type: String, enum: ['CONFIRMED','CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true })

module.exports = mongoose.model('SpecialBooking', SpecialBookingSchema)