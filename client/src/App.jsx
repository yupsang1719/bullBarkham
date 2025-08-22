import { Outlet, NavLink } from 'react-router-dom'
import { Menu, CalendarDays, Images, Phone, UtensilsCrossed } from 'lucide-react'

function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-black/10">
      <div className="container-outer flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-bull-green/10 grid place-items-center font-bold text-bull-green">BB</div>
          <span className="font-serif text-lg">The Bull Barkham</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/events" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Events</NavLink>
          <NavLink to="/menu" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Menu</NavLink>
          <NavLink to="/gallery" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>Gallery</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'link font-medium' : 'link'}>About</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? 'btn btn-ghost' : 'btn btn-ghost'}>Contact</NavLink>
          <a href="/bookings" className="btn btn-primary">Book</a>
        </nav>
        <button className="md:hidden btn btn-ghost" aria-label="Open menu">
          <Menu size={18} />
        </button>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10">
      <div className="container-outer py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div>
          <div className="font-serif text-lg mb-2">The Bull Barkham</div>
          <p>Community pub with live music, karaoke, and a warm welcome.</p>
        </div>
        <div>
          <div className="font-medium mb-2">Quick Links</div>
          <ul className="space-y-2">
            <li><NavLink to="/events" className="link">Events</NavLink></li>
            <li><NavLink to="/menu" className="link">Menu</NavLink></li>
            <li><NavLink to="/gallery" className="link">Gallery</NavLink></li>
            <li><NavLink to="/bookings" className="link">Bookings</NavLink></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Contact</div>
          <ul className="space-y-2">
            <li>Arborfield Rd, Barkham (example)</li>
            <li><a href="tel:+441234567890" className="link">+44 1234 567890</a></li>
            <li><a href="mailto:hello@thebull.co.uk" className="link">hello@thebull.co.uk</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Hours</div>
          <p>Mon–Thu 12–23 • Fri–Sat 12–24 • Sun 12–22 (example)</p>
        </div>
      </div>
      <div className="border-t border-black/10 py-4 text-center text-xs">
        © {new Date().getFullYear()} The Bull Barkham • Built with ❤️ in Barkham
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
