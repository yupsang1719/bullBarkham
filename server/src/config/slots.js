// server/src/config/slots.js
// Single place to control windows, interval and capacity

// Which services are open per weekday (0=Sun..6=Sat)
const WEEKLY_OPEN = {
  0: { lunch: true,  dinner: true  }, // Sun
  1: { lunch: false, dinner: false }, // Mon (closed)
  2: { lunch: true,  dinner: true  }, // Tue
  3: { lunch: true,  dinner: true  }, // Wed
  4: { lunch: true,  dinner: true  }, // Thu
  5: { lunch: true,  dinner: true  }, // Fri
  6: { lunch: true,  dinner: true  }  // Sat
}

const SLOT_RULES = {
  intervalMins: 30,
  capPerSlot: 9,
  lunch:  { start: '12:00', end: '15:00' }, // inclusive of start, exclusive of end
  dinner: { start: '18:00', end: '21:00' }
}

// Helpers
function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number)
  return { h, m }
}
function pad(n){ return String(n).padStart(2,'0') }

// Generate half-hour slots between [start, end)
// Returns: [{ id:'12:00', label:'12:00', service:'lunch' }, ...]
function makeSlotsForService(dateISO, service, { start, end, intervalMins }) {
  const { h: sh, m: sm } = parseHM(start)
  const { h: eh, m: em } = parseHM(end)
  const d = new Date(dateISO + 'T00:00:00')
  const startMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0, 0).getTime()
  const endMs   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0).getTime()

  const out = []
  for (let t = startMs; t < endMs; t += intervalMins * 60 * 1000) {
    const dt = new Date(t)
    const hh = pad(dt.getHours())
    const mm = pad(dt.getMinutes())
    const id = `${hh}:${mm}`
    out.push({ id, label: `${hh}:${mm}`, service })
  }
  return out
}

// Build all slots for a given date adhering to WEEKLY_OPEN
function buildDailySlots(dateISO) {
  const dow = new Date(dateISO.replace(/-/g,'/')).getDay()
  const open = WEEKLY_OPEN[dow] || { lunch:false, dinner:false }

  const slots = []
  if (open.lunch)  slots.push(...makeSlotsForService(dateISO, 'lunch',  { ...SLOT_RULES, ...SLOT_RULES.lunch  }))
  if (open.dinner) slots.push(...makeSlotsForService(dateISO, 'dinner', { ...SLOT_RULES, ...SLOT_RULES.dinner }))
  return slots
}

module.exports = { WEEKLY_OPEN, SLOT_RULES, buildDailySlots }