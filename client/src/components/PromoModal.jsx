import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const HIDE_PATH_PREFIXES = ['/admin']
const HIDE_EXACT_PATHS = ['/christmas', '/christmas/success', '/christmas/cancel']

export default function ChristmasPromoModal() {
  const location = useLocation()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const dialogRef = useRef(null)
  const firstButtonRef = useRef(null)
  const lastActive = useRef(null)

  // Show on every page load/refresh (unless hidden by route)
  useEffect(() => {
    const path = location.pathname
    if (HIDE_EXACT_PATHS.includes(path)) { setOpen(false); return }
    if (HIDE_PATH_PREFIXES.some(p => path.startsWith(p))) { setOpen(false); return }
    setOpen(true)
  }, [location.pathname])

  // Focus handling + Escape + simple focus trap
  useEffect(() => {
    if (!open) return
    lastActive.current = document.activeElement
    const focusTarget = firstButtonRef.current || dialogRef.current
    focusTarget?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables?.length) return
        const list = Array.from(focusables)
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function handleClose() {
    setOpen(false)
    lastActive.current && lastActive.current.focus?.()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xmas-promo-title"
      aria-describedby="xmas-promo-desc"
    >
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div ref={dialogRef} className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl bg-white">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-600 to-emerald-600 text-white p-4">
          <h2 id="xmas-promo-title" className="text-xl font-bold">Important Notice</h2>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 rotate-12">
            <span className="xmas-badge">Special Event</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 grid gap-3">
          <p id="xmas-promo-desc" className="text-black/80">
            We’re <strong>Closed for now</strong> due to maintenance issue.
            We will be back with <strong>Good News Soon</strong>.
            Thank You for Continuous support.<br></br>
            <i>'The Bull Barkham Team'</i>
          </p>
        </div>

        {/* Actions */}
        {/* <div className="p-5 pt-0 flex flex-wrap gap-2">
          <button
            ref={firstButtonRef}
            className="btn btn-primary"
            onClick={() => { handleClose(); nav('/christmas?utm_source=modal') }}
          >
            Book Christmas Day 🎅
          </button>
          <button className="btn btn-ghost" onClick={() => { handleClose(); nav('/bookings') }}>
            Regular Booking Info
          </button>
          <button className="ml-auto btn btn-ghost" onClick={handleClose} aria-label="Close">
            Not now
          </button>
        </div> */}
      </div>
    </div>
  )
}