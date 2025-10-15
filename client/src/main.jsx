import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import App from './App'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Menu_temp from './pages/Menu'
import ShowTimeMenu from './pages/ShowtimeMenu'
import Gallery from './pages/Gallery'
import Bookings from './pages/Bookings'
import Contact from './pages/Contact'

// Admin
import RequireAuth from './pages/Admin/RequiredAuth'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminLogin from './pages/Admin/AdminLogin'
import AdminEvents from './pages/Admin/AdminEvents'
import AdminEventForm from './pages/Admin/AdminEventForm'
import AdminBookings from './pages/Admin/AdminBookings'
import ChristmasBookingPage from './pages/ChristmasBooking'
import ChristmasSuccess from './pages/ChristmasSuccess'
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'events', element: <Events /> },
      { path: 'events/:slug', element: <EventDetail /> },
      { path: 'menu', element: <Menu_temp /> },
      { path: 'menu/showtimeMenu', element: <ShowTimeMenu /> },
      { path: 'gallery', element: <Gallery /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'contact', element: <Contact /> },
      { path: '/christmas', element: <ChristmasBookingPage /> },
      { path: '/christmas/success', element: <ChristmasSuccess /> },
      { path: '/christmas/success', element: <ChristmasSuccess /> },
      {
        path: '/christmas/cancel',
        element: (
          <section className="section">
            <div className="container-outer text-center max-w-xl">
              <h1 className="h1 mb-2">Payment Cancelled</h1>
              <p className="text-black/70 mb-4">
                Your payment was cancelled or not completed. You can try again anytime.
              </p>
              <a href="/christmas" className="btn btn-primary">
                Back to Christmas Booking
              </a>
            </div>
          </section>
        ),
      },

      // Admin
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminLogin /> },      // /admin
          { path: 'events', element: <RequireAuth><AdminEvents /></RequireAuth> },   // /admin/events
          { path: 'events/new', element: <RequireAuth><AdminEventForm /></RequireAuth> },
          { path: 'events/:id', element: <RequireAuth><AdminEventForm /></RequireAuth> },
          { path: 'bookings', element: <RequireAuth><AdminBookings/></RequireAuth>}
        ]
      },

      { path: '*', element: <div className="section container-outer">Page not found</div> }
    ]
  }
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
