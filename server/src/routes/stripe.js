const express = require('express')
const router = express.Router()
const Stripe = require('stripe')
const XmasBooking = require('../models/XmasBooking')
const PendingXmas = require('../models/PendingXmas')
const { notifyXmasEmails } = require('../services/notify')

/* ---------- Config ---------- */
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
const XMAS_EVENT_KEY = process.env.XMAS_EVENT_KEY || 'christmas-2025'
const XMAS_DATE = process.env.XMAS_DATE || '2025-12-25'
const DEPOSIT_GBP = Number(process.env.XMAS_DEPOSIT_GBP || 25)

const SITTINGS = {
  'xmas-early': { label: '12:00 – 2:00 PM', capacity: 30 },
  'xmas-late' : { label: '2:30 – 4:30 PM', capacity: 32 }
}

function normalizeSittingId(input) {
  const s = String(input || '').trim().toLowerCase()
  if (s === 'xmas-early' || s === 'xmas_early') return 'xmas-early'
  if (s === 'xmas-late'  || s === 'xmas_late')  return 'xmas-late'
  if (['12-2','12','12:00','12:00-14:00','12:00 – 14:00','12 – 14','12-00-14-00'].includes(s)) return 'xmas-early'
  if (['2:30-4:30','14:30','14:30-16:30','14:30 – 16:30','2:30 – 4:30','14-30-16-30'].includes(s)) return 'xmas-late'
  return null
}

/* =========================================================
   POST /api/stripe/create-checkout-session
========================================================= */
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' })

    const {
      session, partyAdults, partyChildren,
      name, phone, email,
      allergies = '', occasionNotes = '', specialNotes = '',
      selections = { starters: [], mains: [], desserts: [] }
    } = req.body || {}

    const sittingId = normalizeSittingId(session)
    if (!sittingId || !SITTINGS[sittingId]) return res.status(400).json({ error: 'Invalid sitting' })

    const adults = Number(partyAdults || 0)
    const children = Number(partyChildren || 0)
    const partySize = adults + children
    if (!name || !phone || !email) return res.status(400).json({ error: 'Missing contact fields' })
    if (partySize <= 0) return res.status(400).json({ error: 'Party size must be at least 1' })

    // Capacity check
    const cap = SITTINGS[sittingId].capacity
    const agg = await XmasBooking.aggregate([
      { $match: { eventKey: XMAS_EVENT_KEY, date: XMAS_DATE, sittingId, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, used: { $sum: '$partySize' } } }
    ])
    const used = agg[0]?.used || 0
    const remaining = Math.max(cap - used, 0)
    if (remaining < partySize) return res.status(409).json({ error: `Only ${remaining} seats left in this sitting.` })

    const amountPence = Math.round(DEPOSIT_GBP * 100) * partySize

    const pending = await PendingXmas.create({
      eventKey: XMAS_EVENT_KEY,
      date: XMAS_DATE,
      sittingId,
      sittingLabel: SITTINGS[sittingId].label,
      capAtCreate: cap,

      name, phone, email,
      partyAdults: adults,
      partyChildren: children,
      partySize,
      selections, allergies, occasionNotes, specialNotes,

      amount: amountPence,
      currency: 'gbp',
      status: 'PENDING'
    })

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      phone_number_collection: { enabled: true },
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `Christmas Deposit — ${SITTINGS[sittingId].label}`,
            description: `${partySize} guest(s) · £${DEPOSIT_GBP} per person`
          },
          unit_amount: Math.round(DEPOSIT_GBP * 100)
        },
        quantity: partySize
      }],
      metadata: { pendingId: String(pending._id), eventKey: XMAS_EVENT_KEY, sittingId },
      success_url: `${PUBLIC_BASE_URL}/christmas/success?pid=${pending._id}`,
      cancel_url:  `${PUBLIC_BASE_URL}/christmas/cancel?pid=${pending._id}`
    })

    res.json({ id: checkout.id, url: checkout.url })
  } catch (e) {
    console.error('[stripe] create-checkout-session error', e)
    res.status(500).json({ error: 'Failed to start checkout' })
  }
})

/* =========================================================
   POST /api/stripe/webhook  (raw body required)
========================================================= */
const rawJson = express.raw({ type: 'application/json' })


console.log(endpointSecret)
async function webhookHandler(req, res) {
  if (!stripe || !endpointSecret) return res.sendStatus(200)

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).send('Missing stripe-signature header')

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.warn('[stripe] webhook signature verify failed', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const pendingId = session.metadata?.pendingId
    if (pendingId) {
      try {
        const pending = await PendingXmas.findOne({ _id: pendingId, status: 'PENDING' })
        if (!pending) return res.sendStatus(200)

        // recheck capacity
        const { sittingId, date } = pending
        const cap = pending.capAtCreate || SITTINGS[sittingId]?.capacity || 0
        const agg = await XmasBooking.aggregate([
          { $match: { eventKey: XMAS_EVENT_KEY, date, sittingId, status: { $ne: 'CANCELLED' } } },
          { $group: { _id: null, used: { $sum: '$partySize' } } }
        ])
        const used = agg[0]?.used || 0
        if (used + pending.partySize > cap) {
          pending.status = 'CANCELLED'
          await pending.save()
          return res.sendStatus(200)
        }

        const booking = await XmasBooking.create({
          eventKey: XMAS_EVENT_KEY,
          date,
          sittingId,
          sittingLabel: pending.sittingLabel,
          capAtCreate: pending.capAtCreate,

          name: pending.name, phone: pending.phone, email: pending.email,
          partyAdults: pending.partyAdults, partyChildren: pending.partyChildren, partySize: pending.partySize,
          selections: pending.selections,
          allergies: pending.allergies, occasionNotes: pending.occasionNotes, specialNotes: pending.specialNotes,
          status: 'CONFIRMED'
        })

        pending.status = 'PAID'
        await pending.save()

        notifyXmasEmails(booking).catch(e => console.warn('[notify/xmas] error:', e?.message || e))
      } catch (e) {
        console.error('[stripe webhook] finalize booking error:', e)
      }
    }
  }

  res.sendStatus(200)
}

/* export the raw-bound handler so index.js can mount it before json() */
module.exports.__rawWebhook = [rawJson, webhookHandler]
module.exports.router = router

/* =========================================================
   OPTIONAL: Manual finalize if webhook missed (DEV helper)
   POST /api/stripe/finalize/:pid
========================================================= */
router.post('/finalize/:pid', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
    const { pid } = req.params

    const pending = await PendingXmas.findById(pid)
    if (!pending) return res.status(404).json({ error: 'Not found' })
    if (pending.status !== 'PENDING') return res.json({ ok: true, state: pending.status })

    // Find a paid Checkout Session that has this pendingId
    const found = await stripe.checkout.sessions.search({
      query: `metadata['pendingId']:'${pid}' AND status:'complete' AND payment_status:'paid'`,
      limit: 1
    })
    const paid = found.data?.[0]
    if (!paid) return res.status(409).json({ error: 'No paid session found yet' })

    // mimic webhook finalize
    const sittingId = pending.sittingId
    const date = pending.date
    const cap = pending.capAtCreate || SITTINGS[sittingId]?.capacity || 0
    const agg = await XmasBooking.aggregate([
      { $match: { eventKey: XMAS_EVENT_KEY, date, sittingId, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, used: { $sum: '$partySize' } } }
    ])
    const used = agg[0]?.used || 0
    if (used + pending.partySize > cap) {
      pending.status = 'CANCELLED'
      await pending.save()
      return res.status(409).json({ error: 'Capacity exceeded while finalizing' })
    }

    const booking = await XmasBooking.create({
      eventKey: XMAS_EVENT_KEY,
      date,
      sittingId,
      sittingLabel: pending.sittingLabel,
      capAtCreate: pending.capAtCreate,

      name: pending.name, phone: pending.phone, email: pending.email,
      partyAdults: pending.partyAdults, partyChildren: pending.partyChildren, partySize: pending.partySize,
      selections: pending.selections,
      allergies: pending.allergies, occasionNotes: pending.occasionNotes, specialNotes: pending.specialNotes,
      status: 'CONFIRMED'
    })

    pending.status = 'PAID'
    await pending.save()
    notifyXmasEmails(booking).catch(()=>{})

    res.json({ ok: true })
  } catch (e) {
    console.error('[finalize] error', e)
    res.status(500).json({ error: 'Finalize failed' })
  }
})