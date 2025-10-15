import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

export default function ChristmasSuccess() {
  const [search] = useSearchParams()
  const pid = search.get('pid') || ''
  const [status, setStatus] = useState({ state: 'checking', msg: 'Confirming your booking…' })

  useEffect(() => {
    if (!pid) {
      setStatus({ state: 'error', msg: 'Missing reference id (pid).' })
      return
    }

    // Poll the server a couple of times to allow webhook to run
    let tries = 0
    const tick = async () => {
      tries++
      try {
        const res = await fetch(`${API}/api/christmas/pending/${pid}`)
        if (!res.ok) throw new Error('status not found')
        const data = await res.json()
        if (data.state === 'PAID_CONFIRMED') {
          setStatus({ state: 'ok', msg: 'All set! Your booking is confirmed. A confirmation email has been sent.' })
          return
        }
        if (data.state === 'PAID_AWAITING') {
          if (tries < 6) return setTimeout(tick, 1000) // wait for webhook finalize
          // last-chance: ask server to finalize if webhook was missed (dev helper)
          const fin = await fetch(`${API}/api/stripe/finalize/${pid}`, { method: 'POST' })
          if (fin.ok) {
            setStatus({ state: 'ok', msg: 'All set! Your booking is confirmed. A confirmation email has been sent.' })
          } else {
            setStatus({ state: 'warn', msg: 'Payment received, we are finishing your booking. We will email you shortly.' })
          }
          return
        }
        if (data.state === 'PENDING') {
          if (tries < 6) return setTimeout(tick, 1000)
          setStatus({ state: 'warn', msg: 'We received your payment but are still confirming the booking. We’ll email you shortly.' })
          return
        }
        if (data.state === 'CANCELLED') {
          setStatus({ state: 'error', msg: 'This reservation was cancelled. If money left your account, it will be refunded.' })
          return
        }
        // unknown
        setStatus({ state: 'warn', msg: 'We are checking your booking status. We’ll email you as soon as it is confirmed.' })
      } catch {
        if (tries < 3) return setTimeout(tick, 1000)
        setStatus({ state: 'error', msg: 'Could not verify booking yet. We will email you as soon as it is confirmed.' })
      }
    }

    tick()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid])

  return (
    <section className="section">
      <div className="container-outer max-w-xl text-center">
        <h1 className="h1 mb-2">🎄 Thank you!</h1>
        <p className="text-black/70 mb-6">{status.msg}</p>
        <div className="flex justify-center gap-3">
          <Link className="btn btn-primary" to="/">Home</Link>
          <Link className="btn btn-ghost" to="/contact">Contact</Link>
        </div>
        <div className="text-xs text-black/50 mt-6">Ref: {pid}</div>
      </div>
    </section>
  )
}