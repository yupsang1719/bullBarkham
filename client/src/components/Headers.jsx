// client/src/components/Header.jsx
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)
  const { pathname } = useLocation()
  const drawerRef = useRef(null)

  // Close drawer on route change
  useEffect(() => { setOpen(false); setFoodOpen(false) }, [pathname])

  // Lock scroll when drawer open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-black/10">
      <div className="container-outer flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="font-serif text-lg">The Bull Barkham</span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/events" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Events</NavLink>
          <NavLink to="/menu" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Menu</NavLink>
          <NavLink to="/gallery" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Gallery</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>About</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? 'btn btn-ghost' : 'btn btn-ghost'}>Contact</NavLink>
          <a href="/bookings" className="btn btn-primary">Book</a>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden btn btn-ghost"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-controls="mobile-drawer"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      <div className={`md:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Right-side drawer */}
        <aside
          ref={drawerRef}
          id="mobile-drawer"
          className={[
            'fixed top-0 right-0 h-[100dvh] w-[85vw] max-w-[20rem] bg-white',
            'border-l border-black/10 shadow-xl z-50',
            'transition-transform duration-200',
            open ? 'translate-x-0' : 'translate-x-full'
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          {/* Drawer header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-black/10">
            <span className="font-serif">Menu</span>
            <button className="btn btn-ghost" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Drawer content (scrollable) */}
          <div className="px-4 py-3 overflow-y-auto h-[calc(100dvh-4rem-68px)]">
            <nav className="grid gap-1 text-base">
              <NavLink to="/events" className="link py-2" onClick={() => setOpen(false)}>Events</NavLink>

              {/* Nested: Food */}
              <button
                className="w-full text-left py-2 flex items-center justify-between border-b border-black/5"
                aria-expanded={foodOpen}
                aria-controls="food-submenu"
                onClick={() => setFoodOpen(v => !v)}
              >
                <span className="link">Food</span>
                <ChevronDown
                  size={18}
                  className={`transition-transform ${foodOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                id="food-submenu"
                className={`pl-3 grid overflow-hidden transition-all ${foodOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="min-h-0">
                  <NavLink to="/menu" className="link py-2 block" onClick={() => setOpen(false)}>Menu</NavLink>
                  {/* Deep links to sections on menu page */}
                  <a href="/menu#sunday" className="link py-2 block" onClick={() => setOpen(false)}>Sunday Roasts</a>
                  <a href="/menu#lunch" className="link py-2 block" onClick={() => setOpen(false)}>£12 Lunch</a>
                </div>
              </div>

              <NavLink to="/gallery" className="link py-2" onClick={() => setOpen(false)}>Gallery</NavLink>
              <NavLink to="/about" className="link py-2" onClick={() => setOpen(false)}>About</NavLink>
              <NavLink to="/bookings" className="btn btn-ghost justify-start mt-1" onClick={() => setOpen(false)}>Book a Table</NavLink>
            </nav>
          </div>

          {/* Sticky bottom action */}
          <div className="px-4 py-3 border-t border-black/10 sticky bottom-0 bg-white">
            <a href="/contact" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
              Contact Us
            </a>
          </div>
        </aside>
      </div>
    </header>
  )
}
