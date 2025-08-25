import { Outlet, NavLink } from 'react-router-dom'
import { Menu, CalendarDays, Images, Phone, UtensilsCrossed } from 'lucide-react'
import Header from './components/Headers'

<Header></Header>

function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10">
      <div className="container-outer py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4 text-sm">
        <div>
          <div className="font-serif text-lg mb-2">The Bull Barkham</div>
          <p>Barkham's Table Since Victorian Times.</p>
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
            <li>Barkham Rd, Wokingham RG41 4TL</li>
            <li><a href="tel:+01183049428" className="link">+01183049428</a></li>
            <li><a href="thebullwokingham25@gmail.com" className="link">thebullwokingham25@gmail.com</a></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-2">Hours</div>
          <p>Mon–Thu 12–23 • Fri–Sat 12–24 • Sun 12–22</p>
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
