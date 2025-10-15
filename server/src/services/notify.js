const nodemailer = require('nodemailer')

/* ---------- Transport ---------- */
let mailer = null
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
} else {
  console.warn('[notify] SMTP not configured; emails will be skipped.')
}

/* ---------- Shared helpers ---------- */
function escapeHtml(s='') {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
}
function cap(s=''){ return s ? s[0].toUpperCase() + s.slice(1) : '' }

/* ---------- Normal (table) notify ---------- */
function bookingLabel(b) {
  const svc = b.service ? cap(String(b.service)) : ''
  const time = b.timeSlot || ''
  return [svc, time].filter(Boolean).join(' • ')
}
function summaryLines(b) {
  const lines = [
    `Date: ${b.date}`,
    `Time: ${b.timeSlot || '—'}`,
    `Service: ${b.service || '—'}`,
    `Guest: ${b.name}`,
    `Contact: ${b.phone} | ${b.email}`,
    `Party: ${b.partyAdults} adults, ${b.partyChildren} children (Total ${b.partySize})`
  ]
  if (b.eventSlug) lines.push(`Event: ${b.eventSlug}`)
  if (b.hasAccessibilityNeeds) lines.push(`Accessibility: YES ${b.accessibilityNotes ? `(${b.accessibilityNotes})` : ''}`)
  if (b.allergies) lines.push(`Allergies: ${b.allergies}`)
  if (b.occasion || b.occasionNotes) lines.push(`Occasion: ${b.occasion || ''} ${b.occasionNotes || ''}`.trim())
  if (b.specialNotes) lines.push(`Notes: ${b.specialNotes}`)
  return lines
}
function htmlTable(b){
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
    <table cellpadding="6" style="border-collapse:collapse;background:#fafafa;">
      <tr><td><strong>Date</strong></td><td>${b.date}</td></tr>
      <tr><td><strong>Time</strong></td><td>${escapeHtml(b.timeSlot || '—')}</td></tr>
      <tr><td><strong>Service</strong></td><td>${escapeHtml(b.service || '—')}</td></tr>
      <tr><td><strong>Guest</strong></td><td>${escapeHtml(b.name)}</td></tr>
      <tr><td><strong>Contact</strong></td><td>${escapeHtml(b.phone)} | ${escapeHtml(b.email)}</td></tr>
      <tr><td><strong>Party</strong></td><td>${b.partyAdults} adults, ${b.partyChildren} children (Total ${b.partySize})</td></tr>
      ${b.eventSlug ? `<tr><td><strong>Event</strong></td><td>${escapeHtml(b.eventSlug)}</td></tr>` : ''}
      ${b.hasAccessibilityNeeds ? `<tr><td><strong>Accessibility</strong></td><td>YES ${b.accessibilityNotes ? `(${escapeHtml(b.accessibilityNotes)})` : ''}</td></tr>` : ''}
      ${b.allergies ? `<tr><td><strong>Allergies</strong></td><td>${escapeHtml(b.allergies)}</td></tr>` : ''}
      ${(b.occasion || b.occasionNotes) ? `<tr><td><strong>Occasion</strong></td><td>${escapeHtml(b.occasion || '')} ${escapeHtml(b.occasionNotes || '')}</td></tr>` : ''}
      ${b.specialNotes ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(b.specialNotes)}</td></tr>` : ''}
    </table>
  </div>
  `
}
async function notifyBookingEmails(b) {
  if (!mailer) return
  const from = process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER
  const toMgr = process.env.NOTIFY_EMAIL_TO || ''
  const subjectCore = `${b.date} • ${bookingLabel(b)} • ${b.partySize}p`
  const textLines = summaryLines(b).join('\n')
  const html = htmlTable(b)
  const tasks = []
  tasks.push(
    mailer.sendMail({
      from, to: b.email, replyTo: toMgr || undefined,
      subject: `Your booking is confirmed — The Bull Barkham (${subjectCore})`,
      text: `Thanks ${b.name}, your table is confirmed.\n\n${textLines}\n\nIf you need to change anything, reply to this email or call us.`,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
               <h2 style="margin:0 0 12px;">Your booking is confirmed 🎉</h2>${html}
               <p>If you need to change anything, just reply to this email or call us on +01183049428.</p>
             </div>`
    }).then(
      info => console.log('[notify] customer email sent:', info.messageId || 'ok'),
      err  => console.warn('[notify] customer email failed:', err.message)
    )
  )
  if (toMgr) {
    tasks.push(
      mailer.sendMail({
        from, to: toMgr, replyTo: b.email,
        subject: `New booking (CONFIRMED): ${subjectCore}`,
        text: textLines, html
      }).then(
        info => console.log('[notify] manager email sent:', info.messageId || 'ok'),
        err  => console.warn('[notify] manager email failed:', err.message)
      )
    )
  }
  await Promise.all(tasks)
}

/* ---------- Christmas emails (with pre-order) ---------- */
function preOrderHtml(selections) {
  const block = (title, arr=[]) => {
    if (!arr.length) return ''
    const rows = arr.map(r => `<tr><td>${escapeHtml(r.item)}</td><td style="text-align:right;">${r.count}</td></tr>`).join('')
    return `<h4 style="margin:12px 0 6px;">${escapeHtml(title)}</h4>
            <table cellpadding="6" style="border-collapse:collapse;background:#fff;border:1px solid #eee;width:100%;max-width:640px">
              <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
  }
  return [
    block('Starters', selections?.starters),
    block('Mains', selections?.mains),
    block('Desserts', selections?.desserts)
  ].join('<div style="height:8px;"></div>')
}

async function notifyXmasEmails(b) {
  if (!mailer) return
  const from = process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER
  const toMgr = process.env.NOTIFY_EMAIL_TO || ''
  const subjectCore = `${b.date} • ${b.sittingLabel} • ${b.partySize}p`
  const textIntro = `Thanks ${b.name}, your Christmas Day booking is confirmed.`
  const htmlSummary = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
      <h2 style="margin:0 0 12px;">Christmas Day — Booking Confirmed 🎄</h2>
      <table cellpadding="6" style="border-collapse:collapse;background:#fafafa;">
        <tr><td><strong>Date</strong></td><td>${b.date}</td></tr>
        <tr><td><strong>Sitting</strong></td><td>${escapeHtml(b.sittingLabel)}</td></tr>
        <tr><td><strong>Guest</strong></td><td>${escapeHtml(b.name)}</td></tr>
        <tr><td><strong>Contact</strong></td><td>${escapeHtml(b.phone)} | ${escapeHtml(b.email)}</td></tr>
        <tr><td><strong>Party</strong></td><td>${b.partyAdults} adults, ${b.partyChildren} children (Total ${b.partySize})</td></tr>
        ${b.allergies ? `<tr><td><strong>Allergies</strong></td><td>${escapeHtml(b.allergies)}</td></tr>` : ''}
        ${b.occasionNotes ? `<tr><td><strong>Occasion</strong></td><td>${escapeHtml(b.occasionNotes)}</td></tr>` : ''}
        ${b.specialNotes ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(b.specialNotes)}</td></tr>` : ''}
      </table>
      <div style="height:10px;"></div>
      <h3 style="margin:10px 0 6px;">Your Pre-Order</h3>
      ${preOrderHtml(b.selections)}
      <p style="margin-top:12px;">If you need to change anything, reply to this email or call us on +01183049428.</p>
    </div>
  `
  const tasks = []
  tasks.push(
    mailer.sendMail({
      from, to: b.email, replyTo: toMgr || undefined,
      subject: `Your Christmas booking is confirmed — The Bull Barkham (${subjectCore})`,
      text: `${textIntro}\n\nSitting: ${b.sittingLabel}\nParty: ${b.partySize}\n\nWe’ve recorded your pre-order. If you need to change anything, reply to this email or call us.`,
      html: htmlSummary
    }).then(
      info => console.log('[notify/xmas] customer email sent:', info.messageId || 'ok'),
      err  => console.warn('[notify/xmas] customer email failed:', err.message)
    )
  )
  if (toMgr) {
    tasks.push(
      mailer.sendMail({
        from, to: toMgr, replyTo: b.email,
        subject: `New CHRISTMAS booking: ${subjectCore}`,
        text: `Name: ${b.name}\nPhone: ${b.phone}\nEmail: ${b.email}\nSitting: ${b.sittingLabel}\nParty: ${b.partySize}`,
        html: htmlSummary
      }).then(
        info => console.log('[notify/xmas] manager email sent:', info.messageId || 'ok'),
        err  => console.warn('[notify/xmas] manager email failed:', err.message)
      )
    )
  }
  await Promise.all(tasks)
}

module.exports = { notifyBookingEmails, notifyXmasEmails }