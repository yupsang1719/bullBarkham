const { Schema, model, Types } = require('mongoose')

const BookingSchema = new Schema({
  // Optional link to event
  eventId:   { type: Types.ObjectId, ref: 'Event' },
  eventSlug: { type: String },

  // Contact
  name:  { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },

  // Date & session
  date:    { type: String, required: true },                 // "YYYY-MM-DD"
  session: { type: String, required: true },                 // "lunch-1" | "lunch-2" | ...
  service: { type: String, enum: ['lunch','dinner'], required: true },

  // Party
  partyAdults:   { type: Number, required: true, min: 0 },
  partyChildren: { type: Number, required: true, min: 0 },
  partySize:     { type: Number, required: true, min: 1 },
  groupSize:     { type: Number, required: true, min: 1 },   // kept for legacy compatibility

  // Accessibility
  hasAccessibilityNeeds: { type: Boolean, default: false },
  accessibilityNotes:    { type: String, default: '' },

  // Occasion
  occasion:      { type: String, enum: ['', 'birthday','anniversary','graduation','other'], default: '' },
  occasionNotes: { type: String, default: '' },

  // Allergies & notes
  allergies:   { type: String, default: '' },
  specialNotes:{ type: String, default: '' },

  status: { type: String, enum: ['PENDING','CONFIRMED','CANCELLED'], default: 'PENDING' }
}, { timestamps: true })

module.exports = model('Booking', BookingSchema)
