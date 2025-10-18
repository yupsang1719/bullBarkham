// client/src/pages/ChristmasSuccess.jsx
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

export default function ChristmasSuccess() {
  const [search] = useSearchParams()
  const pid = search.get('pid') || ''
  const [status, setStatus] = useState({ state: 'checking', msg: 'Confirming your booking…' })

  const fired = useRef(false)

  useEffect(() => {
    if (!pid) {
      setStatus({ state: 'error', msg: 'Missing reference id (pid).' })
      return
    }

    let tries = 0
    const tick = async () => {
      tries++
      try {
        const res = await fetch(`${API}/api/christmas/pending/${pid}`)
        if (!res.ok) throw new Error('status not found')
        const data = await res.json()

        if (data.state === 'PAID_CONFIRMED') {
          setStatus({ state: 'ok', msg: 'All set! Your booking is confirmed. A confirmation email has been sent.' })
          if (!fired.current) { fired.current = true; burstConfetti() }
          return
        }
        if (data.state === 'PAID_AWAITING') {
          if (tries < 6) return setTimeout(tick, 1000)
          const fin = await fetch(`${API}/api/christmas/finalize/${pid}`, { method: 'POST' })
          if (fin.ok) {
            setStatus({ state: 'ok', msg: 'All set! Your booking is confirmed. A confirmation email has been sent.' })
            if (!fired.current) { fired.current = true; burstConfetti() }
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
    <section className="section relative">
      <div className="xmas-snow pointer-events-none" />
      <div className="container-outer max-w-xl text-center">
        <h1 className="h1 mb-2">🎄 Thank you!</h1>
        <p className="text-black/70 mb-6">{status.msg}</p>
        <div className="flex justify-center gap-3">
          <Link className="btn btn-primary" to="/">Home</Link>
          <Link className="btn btn-ghost" to="/contact">Contact</Link>
        </div>
        <div className="text-xs text-black/50 mt-6">Ref: {pid}</div>
      </div>

      {/* Confetti canvas (created on the fly) */}
      <canvas id="confetti-canvas" className="pointer-events-none fixed inset-0 w-full h-full" style={{ zIndex: 30 }} />
    </section>
  )
}

/* --------- Tiny confetti --------- */
function burstConfetti() {
  const canvas = document.getElementById('confetti-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  const dpr = window.devicePixelRatio || 1
  function resize() {
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
  }
  resize()
  window.addEventListener('resize', resize, { passive: true })

  const colors = ['#e11d48','#16a34a','#f59e0b','#06b6d4','#a855f7']
  const pieces = Array.from({ length: 140 }).map(() => ({
    x: Math.random() * canvas.width,
    y: -20 * dpr,
    w: 6 * dpr,
    h: 12 * dpr,
    vx: (Math.random() - 0.5) * 3 * dpr,
    vy: (2 + Math.random() * 3) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)]
  }))

  let running = true
  const t0 = performance.now()

  function frame(t) {
    if (!running) return
    const dt = Math.min(33, t - (frame.last || t))
    frame.last = t

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of pieces) {
      p.vy += 0.03 * dpr
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h)
      ctx.restore()
    }

    // stop after ~3.5s
    if (t - t0 > 3500) {
      running = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      window.removeEventListener('resize', resize)
      return
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}