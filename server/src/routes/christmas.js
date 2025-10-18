// server/src/routes/christmas.js
const router = require('express').Router()
const XmasBooking = require('../models/XmasBooking')
const PendingXmas = require('../models/PendingXmas') // used by /pending/* helpers
const XmasClosure = require('../models/XmasClosure')

// ---- Config: keep in sync with stripe.js ----
const XMAS_EVENT_KEY = process.env.XMAS_EVENT_KEY || 'christmas-2025'
const XMAS_DATE      = process.env.XMAS_DATE || '2025-12-25'
const SITTINGS = {
  'xmas-early': { label: '12:00 – 2:00 PM', capacity: 30 },
  'xmas-late':  { label: '2:30 – 4:30 PM', capacity: 32 }
}

/* ---------- Utils ---------- */
function esc(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
}
function csvCell(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
}

/* =========================================================
   PUBLIC: Availability (considers closures)
   GET /api/christmas/availability
========================================================= */
router.get('/availability', async (_req, res) => {
  try {
    const agg = await XmasBooking.aggregate([
      { $match: { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$sittingId', used: { $sum: '$partySize' } } }
    ])
    const usedById = Object.fromEntries(agg.map(x => [x._id, x.used]))

    let closedSet = new Set()
    try {
      const closures = await XmasClosure.find({ eventKey: XMAS_EVENT_KEY, date: XMAS_DATE }).lean()
      closedSet = new Set(closures.map(c => c.sittingId))
    } catch {}

    const out = {}
    for (const [id, def] of Object.entries(SITTINGS)) {
      const cap = def.capacity
      const used = usedById[id] || 0
      const remaining = Math.max(cap - used, 0)
      out[id] = closedSet.has(id)
        ? { label: def.label, capacity: cap, remaining: 0, closed: true }
        : { label: def.label, capacity: cap, remaining, closed: false }
    }
    res.json(out)
  } catch (e) {
    console.error('[christmas] availability error', e)
    res.status(500).json({ error: 'availability failed' })
  }
})

/* =========================================================
   PUBLIC: Success page status helpers
========================================================= */
router.get('/pending/:pid', async (req, res) => {
  try {
    const p = await PendingXmas.findById(req.params.pid).lean()
    if (!p) return res.status(404).json({ state: 'UNKNOWN' })
    if (p.status === 'CANCELLED') return res.json({ state: 'CANCELLED' })
    if (p.status === 'PENDING')   return res.json({ state: 'PENDING' })

    if (p.status === 'PAID') {
      const exists = await XmasBooking.exists({
        eventKey: XMAS_EVENT_KEY, date: p.date, sittingId: p.sittingId,
        email: p.email, partySize: p.partySize, status: { $ne: 'CANCELLED' }
      })
      return res.json({ state: exists ? 'PAID_CONFIRMED' : 'PAID_AWAITING' })
    }
    return res.json({ state: 'PENDING' })
  } catch (e) {
    console.error('[christmas] pending error', e)
    res.status(500).json({ state: 'UNKNOWN' })
  }
})

router.post('/finalize/:pid', async (req, res) => {
  try {
    const p = await PendingXmas.findById(req.params.pid)
    if (!p) return res.status(404).json({ ok: false, error: 'not found' })
    if (p.status !== 'PAID') return res.status(409).json({ ok: false, error: 'not paid yet' })

    const already = await XmasBooking.exists({
      eventKey: XMAS_EVENT_KEY, date: p.date, sittingId: p.sittingId,
      email: p.email, partySize: p.partySize, status: { $ne: 'CANCELLED' }
    })
    if (already) return res.json({ ok: true })

    await XmasBooking.create({
      eventKey: XMAS_EVENT_KEY, date: p.date, sittingId: p.sittingId,
      sittingLabel: p.sittingLabel, capAtCreate: p.capAtCreate,
      name: p.name, phone: p.phone, email: p.email,
      partyAdults: p.partyAdults, partyChildren: p.partyChildren, partySize: p.partySize,
      selections: p.selections, allergies: p.allergies, occasionNotes: p.occasionNotes, specialNotes: p.specialNotes,
      status: 'CONFIRMED'
    })
    res.json({ ok: true })
  } catch (e) {
    console.error('[christmas] finalize error', e)
    res.status(500).json({ ok: false })
  }
})

/* =========================================================
   ADMIN: Bookings — list/create/update(cancel/confirm)
   (Secure these with your auth middleware if you have one)
========================================================= */
// GET /api/christmas/admin/bookings?sittingId=&status=
router.get('/admin/bookings', async (req, res) => {
  try {
    const { sittingId, status } = req.query
    const q = { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE }
    if (sittingId) q.sittingId = sittingId
    if (status) q.status = status
    const list = await XmasBooking.find(q).sort({ sittingId: 1, createdAt: 1 }).lean()
    res.json(list)
  } catch (e) {
    console.error('[christmas] admin list error', e)
    res.status(500).json({ error: 'list failed' })
  }
})

// POST /api/christmas/admin/bookings  (admin creates a booking)
router.post('/admin/bookings', async (req, res) => {
  try {
    const {
      sittingId, name, phone, email,
      partyAdults = 0, partyChildren = 0,
      selections = { starters: [], mains: [], desserts: [] },
      allergies = '', occasionNotes = '', specialNotes = ''
    } = req.body || {}

    if (!SITTINGS[sittingId]) return res.status(400).json({ error: 'Invalid sitting' })
    if (!name || !phone || !email) return res.status(400).json({ error: 'Missing contact fields' })
    const partySize = Number(partyAdults||0) + Number(partyChildren||0)
    if (partySize <= 0) return res.status(400).json({ error: 'Party must be at least 1' })

    // capacity check (ignores CANCELLED)
    const cap = SITTINGS[sittingId].capacity
    const agg = await XmasBooking.aggregate([
      { $match: { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, sittingId, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, used: { $sum: '$partySize' } } }
    ])
    const used = agg[0]?.used || 0
    if (used + partySize > cap) return res.status(409).json({ error: `Over capacity. Only ${Math.max(cap - used, 0)} left.` })

    const booking = await XmasBooking.create({
      eventKey: XMAS_EVENT_KEY,
      date: XMAS_DATE,
      sittingId,
      sittingLabel: SITTINGS[sittingId].label,
      capAtCreate: cap,

      name, phone, email,
      partyAdults, partyChildren, partySize,
      selections, allergies, occasionNotes, specialNotes,

      status: 'CONFIRMED'
    })
    res.json(booking)
  } catch (e) {
    console.error('[christmas] admin create error', e)
    res.status(500).json({ error: 'create failed' })
  }
})

// PATCH /api/christmas/admin/bookings/:id   { status?: 'CANCELLED'|'CONFIRMED', ...updates }
router.patch('/admin/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params
    const update = {}
    if (req.body.status && ['CANCELLED','CONFIRMED'].includes(req.body.status)) {
      update.status = req.body.status
    }
    // Optional small edits
    ;['allergies','occasionNotes','specialNotes','phone','email','name'].forEach(k => {
      if (typeof req.body[k] === 'string') update[k] = req.body[k]
    })

    const item = await XmasBooking.findByIdAndUpdate(id, update, { new: true })
    if (!item) return res.status(404).json({ error: 'not found' })
    res.json(item)
  } catch (e) {
    console.error('[christmas] admin patch error', e)
    res.status(500).json({ error: 'update failed' })
  }
})

/* =========================================================
   ADMIN: Closures (close/reopen sittings)
========================================================= */
// GET /api/christmas/admin/closures
router.get('/admin/closures', async (_req, res) => {
  try {
    const list = await XmasClosure.find({ eventKey: XMAS_EVENT_KEY, date: XMAS_DATE }).sort({ sittingId: 1 }).lean()
    res.json(list)
  } catch (e) {
    console.error('[christmas] closures list error', e)
    res.status(500).json({ error: 'closures list failed' })
  }
})

// POST /api/christmas/admin/closures { sittingId, reason }
router.post('/admin/closures', async (req, res) => {
  try {
    const { sittingId, reason = '' } = req.body || {}
    if (!SITTINGS[sittingId]) return res.status(400).json({ error: 'Invalid sitting' })
    const row = await XmasClosure.findOneAndUpdate(
      { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, sittingId },
      { $set: { reason } },
      { upsert: true, new: true }
    )
    res.json(row)
  } catch (e) {
    console.error('[christmas] close sitting error', e)
    res.status(500).json({ error: 'close failed' })
  }
})

// DELETE /api/christmas/admin/closures/:id
router.delete('/admin/closures/:id', async (req, res) => {
  try {
    const ok = await XmasClosure.findByIdAndDelete(req.params.id)
    if (!ok) return res.status(404).json({ error: 'not found' })
    res.json({ ok: true })
  } catch (e) {
    console.error('[christmas] reopen sitting error', e)
    res.status(500).json({ error: 'reopen failed' })
  }
})

/* =========================================================
   CSV: All bookings
   GET /api/christmas/orders.csv?sittingId=...
========================================================= */
router.get('/orders.csv', async (req, res) => {
  try {
    const { sittingId } = req.query
    const q = { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } }
    if (sittingId) q.sittingId = sittingId
    const rows = await XmasBooking.find(q).sort({ sittingId: 1, createdAt: 1 }).lean()

    const headers = ['Booking ID','Sitting','Name','Phone','Email','Adults','Children','Total',
      'Allergies','Occasion Notes','Special Notes','Starters','Mains','Desserts','Created At']
    const out = [headers.map(csvCell).join(',')]

    const pack = (arr=[]) => arr.map(it => `${it.item}: ${Number(it.count)||0}`).join('; ')
    for (const b of rows) {
      out.push([
        b._id, (SITTINGS[b.sittingId]?.label || b.sittingLabel || b.sittingId),
        b.name, b.phone, b.email,
        b.partyAdults||0, b.partyChildren||0, b.partySize||0,
        b.allergies||'', b.occasionNotes||'', b.specialNotes||'',
        pack(b.selections?.starters), pack(b.selections?.mains), pack(b.selections?.desserts),
        b.createdAt ? new Date(b.createdAt).toLocaleString() : ''
      ].map(csvCell).join(','))
    }

    const csv = out.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="xmas_orders_${XMAS_DATE}${sittingId?`_${sittingId}`:''}.csv"`)
    res.send(csv)
  } catch (e) {
    console.error('[christmas] orders.csv error', e)
    res.status(500).send('CSV failed')
  }
})

/* =========================================================
   CSV: Chef prep summary
   GET /api/christmas/orders-summary.csv?sittingId=...
========================================================= */
router.get('/orders-summary.csv', async (req, res) => {
  try {
    const { sittingId } = req.query
    const q = { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } }
    if (sittingId) q.sittingId = sittingId
    const rows = await XmasBooking.find(q).lean()

    const bucket = { starters: {}, mains: {}, desserts: {} }
    const bump = (obj, k, n=0) => { obj[k] = (obj[k]||0) + (Number(n)||0) }
    for (const b of rows) {
      (b.selections?.starters||[]).forEach(it => bump(bucket.starters, it.item, it.count))
      (b.selections?.mains||[]).forEach(it    => bump(bucket.mains,    it.item, it.count))
      (b.selections?.desserts||[]).forEach(it => bump(bucket.desserts, it.item, it.count))
    }

    const out = [['Course','Item','Qty'].map(csvCell).join(',')]
    const push = (course) => {
      Object.entries(bucket[course]||{}).sort((a,b)=>a[0].localeCompare(b[0]))
        .forEach(([item, qty]) => out.push([course, item, qty].map(csvCell).join(',')))
    }
    push('starters'); push('mains'); push('desserts')

    const csv = out.join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="xmas_prep_${XMAS_DATE}${sittingId?`_${sittingId}`:''}.csv"`)
    res.send(csv)
  } catch (e) {
    console.error('[christmas] orders-summary.csv error', e)
    res.status(500).send('CSV summary failed')
  }
})

/* =========================================================
   PRINT: Individual booking — clean HTML
   GET /api/christmas/print/booking/:id
========================================================= */
router.get('/print/booking/:id', async (req, res) => {
  try {
    const b = await XmasBooking.findById(req.params.id).lean()
    if (!b) return res.status(404).send('Not found')
    const sit = (SITTINGS[b.sittingId]?.label) || b.sittingLabel || b.sittingId

    const block = (title, items=[]) => !items?.length ? '' : `
      <div class="card">
        <h3>${esc(title)}</h3>
        <table>
          <thead><tr><th>Dish</th><th class="r">Qty</th></tr></thead>
          <tbody>${items.map(it => `<tr><td>${esc(it.item)}</td><td class="r">${Number(it.count)||0}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Booking #${esc(b._id)}</title>
      <style>
        body{font:14px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px}
        .card{border:1px solid #ddd;border-radius:6px;padding:12px;margin:8px 0}
        table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #eee;padding:6px 8px}
        .r{text-align:right}.muted{color:#666;font-size:12px}
        @media print{ body{margin:0} .no-print{display:none}}
      </style>
      </head><body>
        <div class="no-print muted">Print: Ctrl/Cmd+P</div>
        <h1>Christmas Booking — ${esc(sit)}</h1>
        <div class="muted">${esc(XMAS_DATE)}</div>

        <div class="card">
          <div><strong>Guest:</strong> ${esc(b.name)}</div>
          <div class="muted">${esc(b.phone)} · ${esc(b.email)}</div>
          <div><strong>Party:</strong> ${b.partySize} (A${b.partyAdults||0}/C${b.partyChildren||0})</div>
          ${b.allergies ? `<div><strong>Allergies:</strong> ${esc(b.allergies)}</div>` : ''}
          ${b.occasionNotes ? `<div><strong>Occasion:</strong> ${esc(b.occasionNotes)}</div>` : ''}
          ${b.specialNotes ? `<div><strong>Notes:</strong> ${esc(b.specialNotes)}</div>` : ''}
        </div>

        ${block('Starters', b.selections?.starters)}
        ${block('Mains',    b.selections?.mains)}
        ${block('Desserts', b.selections?.desserts)}
      </body></html>`
    res.set('Content-Type','text/html; charset=utf-8').send(html)
  } catch (e) {
    console.error('[christmas] print booking error', e)
    res.status(500).send('Print failed')
  }
})

/* =========================================================
   PRINT: Orders list — kitchen view (optional ?sittingId=)
   GET /api/christmas/print/orders
========================================================= */
router.get('/print/orders', async (req, res) => {
  try {
    const { sittingId } = req.query
    const q = { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } }
    if (sittingId) q.sittingId = sittingId
    const rows = await XmasBooking.find(q).sort({ sittingId: 1, createdAt: 1 }).lean()

    const htmlRows = rows.map(b => {
      const sit = SITTINGS[b.sittingId]?.label || b.sittingLabel || b.sittingId
      const pack = (title, items=[]) =>
        !items?.length ? '' :
        `<div class="muted"><strong>${esc(title)}</strong></div>
         <ul>${items.map(it => `<li>${esc(it.item)} — <strong>${Number(it.count)||0}</strong></li>`).join('')}</ul>`
      return `<tr>
        <td>${esc(sit)}</td>
        <td><div><strong>${esc(b.name)}</strong></div><div class="muted">${esc(b.phone)} · ${esc(b.email)}</div></td>
        <td class="r">${b.partySize} (A${b.partyAdults||0}/C${b.partyChildren||0})</td>
        <td>
          ${pack('Starters', b.selections?.starters)}
          ${pack('Mains',    b.selections?.mains)}
          ${pack('Desserts', b.selections?.desserts)}
          ${b.allergies ? `<div class="muted"><strong>Allergies:</strong> ${esc(b.allergies)}</div>` : ''}
          ${b.specialNotes ? `<div class="muted"><strong>Notes:</strong> ${esc(b.specialNotes)}</div>` : ''}
        </td>
      </tr>`
    }).join('')

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Christmas Orders</title>
      <style>
        body{font:14px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px}
        table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #eee;padding:8px;vertical-align:top}
        .muted{color:#666;font-size:12px}.r{text-align:right}
        @media print{ body{margin:0} .no-print{display:none}}
      </style>
      </head><body>
        <div class="no-print muted">Print: Ctrl/Cmd+P</div>
        <h1>Christmas Orders ${sittingId ? `— ${esc(SITTINGS[sittingId]?.label || sittingId)}` : ''}</h1>
        <div class="muted">${esc(XMAS_DATE)}</div>
        <table>
          <thead><tr><th>Sitting</th><th>Guest</th><th class="r">Party</th><th>Pre-order</th></tr></thead>
          <tbody>${htmlRows}</tbody>
        </table>
      </body></html>`
    res.set('Content-Type','text/html; charset=utf-8').send(html)
  } catch (e) {
    console.error('[christmas] print orders error', e)
    res.status(500).send('Print failed')
  }
})

/* =========================================================
   PRINT: Chef prep summary (HTML)
   GET /api/christmas/print/summary?sittingId=...
========================================================= */
router.get('/print/summary', async (req, res) => {
  try {
    const { sittingId } = req.query
    const q = { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, status: { $ne: 'CANCELLED' } }
    if (sittingId) q.sittingId = sittingId
    const rows = await XmasBooking.find(q).lean()

    const bucket = { starters: {}, mains: {}, desserts: {} }
    const bump = (obj, k, n=0) => { obj[k] = (obj[k]||0) + (Number(n)||0) }
    for (const b of rows) {
      (b.selections?.starters||[]).forEach(it => bump(bucket.starters, it.item, it.count))
      (b.selections?.mains||[]).forEach(it    => bump(bucket.mains,    it.item, it.count))
      (b.selections?.desserts||[]).forEach(it => bump(bucket.desserts, it.item, it.count))
    }
    const table = (title, obj) => {
      const entries = Object.entries(obj||{}).sort((a,b)=>a[0].localeCompare(b[0]))
      if (!entries.length) return ''
      return `<div class="card"><h3>${esc(title)}</h3>
        <table><thead><tr><th>Dish</th><th class="r">Qty</th></tr></thead>
        <tbody>${entries.map(([name,qty])=>`<tr><td>${esc(name)}</td><td class="r">${qty}</td></tr>`).join('')}</tbody>
        </table></div>`
    }
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Christmas Prep Summary</title>
      <style>
        body{font:14px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px}
        .card{border:1px solid #ddd;border-radius:6px;padding:12px;margin:8px 0}
        table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #eee;padding:6px 8px}
        .r{text-align:right}.muted{color:#666;font-size:12px}
        @media print{ body{margin:0} }
      </style>
      </head><body>
        <h1>Christmas Prep Summary ${sittingId ? `— ${esc(SITTINGS[sittingId]?.label || sittingId)}` : ''}</h1>
        <div class="muted">${esc(XMAS_DATE)}</div>
        ${table('Starters', bucket.starters)}
        ${table('Mains',    bucket.mains)}
        ${table('Desserts', bucket.desserts)}
      </body></html>`
    res.set('Content-Type','text/html; charset=utf-8').send(html)
  } catch (e) {
    console.error('[christmas] print summary error', e)
    res.status(500).send('Print summary failed')
  }
})

module.exports = router