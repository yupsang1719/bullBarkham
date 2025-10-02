// server/src/utils/christmas.js
const CAP_A = Number(process.env.XMAS_CAP_A || 30) // 12:00–14:00
const CAP_B = Number(process.env.XMAS_CAP_B || 32) // 14:30–16:30
const XMAS_DATE = process.env.XMAS_DATE || '2025-12-25'

const SESSION_LABELS = {
  'xmas-a': '12:00 – 14:00',
  'xmas-b': '14:30 – 16:30'
}

// For a fixed-date event we don’t need date validation logic.
// We still expose a helper to read capacities/sessions.
function getFixedDate() {
  return XMAS_DATE
}

function sessionsForChristmas() {
  return [
    { id: 'xmas-a', label: SESSION_LABELS['xmas-a'], capacity: CAP_A },
    { id: 'xmas-b', label: SESSION_LABELS['xmas-b'], capacity: CAP_B }
  ]
}

const PRICE_ADULT = Number(process.env.XMAS_ADULT_PRICE || 95)
const PRICE_CHILD = Number(process.env.XMAS_CHILD_PRICE || 50)
const DEPOSIT_PP  = Number(process.env.XMAS_DEPOSIT_PER_PERSON || 25)

module.exports = {
  getFixedDate,
  sessionsForChristmas,
  SESSION_LABELS,
  PRICE_ADULT, PRICE_CHILD, DEPOSIT_PP
}