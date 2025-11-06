// server/src/utils/slots.js

// Service windows by weekday (0=Sun..6=Sat)
const WINDOWS = {
  lunch:  { start: '12:00', end: '15:00' }, // Mon closed via servicesByDow
  dinner: { start: '18:00', end: '21:00' }  // Tue–Sat only
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function fromMinutes(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0')
  const m = String(mins % 60).padStart(2, '0')
  return `${h}:${m}`
}

// Build 30-min slots inclusive of start, last slot is 30 mins before end
function makeSlots(startHHMM, endHHMM, step = 30) {
  const out = []
  const start = toMinutes(startHHMM)
  const lastSelectable = toMinutes(endHHMM) - step
  for (let t = start; t <= lastSelectable; t += step) out.push(fromMinutes(t))
  return out
}

// Which services are open on this weekday
function servicesByDow(dow) {
  if (dow === 1) return []             // Monday closed
  if (dow === 0) return ['lunch']      // Sunday lunch only
  return ['lunch','dinner']            // Tue–Sat
}

function isIsoDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s) }

// All slots for a day with attached service
function buildDaySlots(isoDate) {
  if (!isIsoDate(isoDate)) return []
  const d = new Date(isoDate + 'T00:00:00')
  const services = servicesByDow(d.getDay())
  const out = []
  for (const svc of services) {
    const win = WINDOWS[svc]
    makeSlots(win.start, win.end, 30).forEach(time => out.push({ time, service: svc }))
  }
  return out
}

// Derive service from time-of-day
function serviceOfTime(timeHHMM) {
  const lunchSlots = makeSlots(WINDOWS.lunch.start, WINDOWS.lunch.end, 30)
  if (lunchSlots.includes(timeHHMM)) return 'lunch'
  const dinnerSlots = makeSlots(WINDOWS.dinner.start, WINDOWS.dinner.end, 30)
  if (dinnerSlots.includes(timeHHMM)) return 'dinner'
  return null
}

module.exports = { WINDOWS, makeSlots, servicesByDow, buildDaySlots, serviceOfTime, isIsoDate }