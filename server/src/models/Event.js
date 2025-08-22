const { Schema, model } = require('mongoose')
const EventSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  date: { type: String, required: true },   // YYYY-MM-DD
  time: { type: String, required: true },   // HH:mm
  tags: [String],
  cover: String,
  badges: [String],
  summary: String,
  isMajor: { type: Boolean, default: false }
}, { timestamps: true })
module.exports = model('Event', EventSchema)
