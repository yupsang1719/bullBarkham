import { loadStripe } from '@stripe/stripe-js'

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
if (!pk || !pk.startsWith('pk_')) {
  // This throws early & clearly instead of a vague "match" error
  throw new Error('Stripe publishable key missing or invalid. Set VITE_STRIPE_PUBLISHABLE_KEY in client/.env')
}

export const stripePromise = loadStripe(pk)