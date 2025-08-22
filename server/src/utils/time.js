// Sessions-only config
// id: machine id; label: shown to staff; service: lunch|dinner
const SESSIONS = [
  { id: 'lunch-1',  service: 'lunch',  label: '11:45 – 13:45' },
  { id: 'lunch-2',  service: 'lunch',  label: '14:00 – 16:00' },
  { id: 'dinner-1', service: 'dinner', label: '17:45 – 19:45' },
  { id: 'dinner-2', service: 'dinner', label: '20:00 – 22:00' },
]

const SESSION_BY_ID = Object.fromEntries(SESSIONS.map(s => [s.id, s]))

function isValidSessionId(id) {
  return Boolean(SESSION_BY_ID[id])
}

function serviceOf(sessionId) {
  return SESSION_BY_ID[sessionId]?.service || null
}

function sessionsForService(service) {
  return SESSIONS.filter(s => s.service === service)
}

module.exports = {
  SESSIONS,
  SESSION_BY_ID,
  isValidSessionId,
  serviceOf,
  sessionsForService
}
