const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendMail({ to, subject, text, html, replyTo }) {
  const opts = {
    from: process.env.NOTIFY_EMAIL_FROM,
    to,
    subject,
    text,
    html,
  }
  if (replyTo) opts.replyTo = replyTo

  const info = await transporter.sendMail(opts)
  console.log(`[notify] email sent: ${info.messageId} -> ${to}`)
  return info
}

module.exports = { sendMail }
