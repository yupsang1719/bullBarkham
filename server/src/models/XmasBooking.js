const mongoose = require('mongoose')

const SelectionSchema = new mongoose.Schema({
  item: { type: String, required: true },
  count: { type: Number, min: 0, required: true }
}, { _id: false })

const XmasBookingSchema = new mongoose.Schema({
  // fixed event metadata
  eventKey: { type: String, default: 'christmas-2025', index: true }, // allows future reuse
  date: { type: String, required: true }, // YYYY-MM-DD (e.g. "2025-12-25")

  // sittings
  sittingId: { type: String, enum: ['xmas-early','xmas-late'], required: true },
  sittingLabel: { type: String, required: true }, // "12:00 – 14:00" or "14:30 – 16:30"
  capAtCreate: { type: Number, required: true },  // snapshot of capacity used when created

  // contact
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },

  // party
  partyAdults: { type: Number, min: 0, required: true },
  partyChildren: { type: Number, min: 0, required: true },
  partySize: { type: Number, min: 1, required: true },

  // pre-order
  selections: {
    starters: [SelectionSchema],
    mains: [SelectionSchema],
    desserts: [SelectionSchema]
  },

  // notes
  allergies: { type: String, default: '' },
  occasionNotes: { type: String, default: '' },
  specialNotes: { type: String, default: '' },

  status: { type: String, enum: ['CONFIRMED','CANCELLED','PENDING'], default: 'CONFIRMED', index: true }
}, { timestamps: true })

module.exports = mongoose.model('XmasBooking', XmasBookingSchema)