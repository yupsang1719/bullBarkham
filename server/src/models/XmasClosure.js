// server/src/models/XmasClosure.js
const mongoose = require('mongoose')

const XmasClosureSchema = new mongoose.Schema({
  eventKey: { type: String, required: true, index: true }, // e.g. 'christmas-2025'
  date:     { type: String, required: true },              // e.g. '2025-12-25'
  sittingId:{ type: String, enum: ['xmas-early','xmas-late'], required: true },
  reason:   { type: String, default: '' }
}, { timestamps: true })

XmasClosureSchema.index({ eventKey: 1, date: 1, sittingId: 1 }, { unique: true })

module.exports = mongoose.model('XmasClosure', XmasClosureSchema)