const mongoose = require('mongoose')

const SelectionSchema = new mongoose.Schema({
  item: { type: String, required: true },
  count: { type: Number, min: 0, required: true }
}, { _id: false })

const PendingXmasSchema = new mongoose.Schema({
  eventKey: { type: String, default: 'christmas-2025', index: true },
  date: { type: String, required: true }, // "2025-12-25"

  sittingId: { type: String, enum: ['xmas-early','xmas-late'], required: true },
  sittingLabel: { type: String, required: true },
  capAtCreate: { type: Number, required: true },

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

  amount: { type: Number, required: true },   // in pence
  currency: { type: String, default: 'gbp' },

  stripeSessionId: { type: String, index: true },
  status: { type: String, enum: ['PENDING','PAID','CANCELLED','EXPIRED'], default: 'PENDING', index: true },

  // TTL to auto-expire abandoned checkouts (e.g., 30 minutes)
  expiresAt: { type: Date, index: { expires: '30m' } }
}, { timestamps: true })

module.exports = mongoose.model('PendingXmas', PendingXmasSchema)