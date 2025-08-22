// server/src/services/notify.js
const nodemailer = require('nodemailer')

/* ---------- Transport ---------- */
let mailer = null
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true', // true for 465
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
} else {
  console.warn('[notify] SMTP not configured; emails will be skipped.')
}

/* ---------- Labels ---------- */
const SESSION_LABELS = {
  'lunch-1':  'Lunch — 11:45–13:45',
  'lunch-2':  'Lunch — 14:00–16:00',
  'dinner-1': 'Dinner — 17:45–19:45',
  'dinner-2': 'Dinner — 20:00–22:00'
}

/* ---------- Helpers ---------- */
function escapeHtml(s='') {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
}

function summaryLines(b) {
  const lines = [
    `Date: ${b.date}`,
    `Session: ${SESSION_LABELS[b.session] || b.session} (${b.service})`,
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
  const s = SESSION_LABELS[b.session] || b.session
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
    <table cellpadding="6" style="border-collapse:collapse;background:#fafafa;">
      <tr><td><strong>Date</strong></td><td>${b.date}</td></tr>
      <tr><td><strong>Session</strong></td><td>${s} (${b.service})</td></tr>
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

/* ---------- Public: send both emails ---------- */
async function notifyBookingEmails(b) {
  if (!mailer) return

  const from = process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER
  const toMgr = process.env.NOTIFY_EMAIL_TO || '' // may be comma-separated
  const subjectCore = `${b.date} • ${SESSION_LABELS[b.session] || b.session} • ${b.partySize}p`

  const textLines = summaryLines(b).join('\n')
  const html = htmlTable(b)

  const tasks = []

  // Customer confirmation — Reply-To goes to manager
  tasks.push(
    mailer.sendMail({
      from,
      to: b.email,
      replyTo: toMgr || undefined, // 👈 customer's reply goes to manager inbox
      subject: `Your booking is confirmed — The Bull Barkham (${subjectCore})`,
      text: `Thanks ${b.name}, your table is confirmed.\n\n${textLines}\n\nIf you need to change anything, reply to this email or call us.`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;">
          <h2 style="margin:0 0 12px;">Your booking is confirmed 🎉</h2>
          ${html}
          <p>If you need to change anything, just reply to this email or call us.</p>
        </div>
      `
    }).then(
      info => console.log('[notify] customer email sent:', info.messageId || 'ok'),
      err  => console.warn('[notify] customer email failed:', err.message)
    )
  )

  // Manager notification — Reply-To goes to customer
  if (toMgr) {
    tasks.push(
      mailer.sendMail({
        from,
        to: toMgr,
        replyTo: b.email, // 👈 manager can reply straight to guest
        subject: `New booking (CONFIRMED): ${subjectCore}`,
        text: textLines,
        html
      }).then(
        info => console.log('[notify] manager email sent:', info.messageId || 'ok'),
        err  => console.warn('[notify] manager email failed:', err.message)
      )
    )
  }

  await Promise.all(tasks)
}

module.exports = { notifyBookingEmails }
