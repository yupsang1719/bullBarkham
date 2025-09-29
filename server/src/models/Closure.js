// server/src/models/Closure.js
const mongoose = require('mongoose')

const ClosureSchema = new mongoose.Schema({
  date: { type: String, required: true },             // YYYY-MM-DD
  service: { type: String, enum: ['lunch','dinner'], required: true },
  reason: { type: String, default: '' }
}, { timestamps: true, versionKey: false })

// optional uniqueness: only one closure per date+service
ClosureSchema.index({ date: 1, service: 1 }, { unique: true })

module.exports = mongoose.model('Closure', ClosureSchema)