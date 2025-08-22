import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../../lib/admin'

export default function AdminLayout() {
  const loggedIn = !!getToken()
  const nav = useNavigate()
  return (
    <section className="section">
      <div className="container-outer">
        <div className="flex items-center justify-between mb-6">
          <h1 className="h1">Admin</h1>
          {loggedIn && (
            <button className="btn btn-ghost" onClick={() => { clearToken(); nav('/admin') }}>
              Logout
            </button>
          )}
        </div>

        {loggedIn && (
          <nav className="flex gap-4 mb-6 text-sm">
            <NavLink to="/admin/events" className="link">Events</NavLink>
            <NavLink to="/admin/bookings" className="link">Bookings</NavLink>
          </nav>
        )}

        <Outlet />
      </div>
    </section>
  )
}
