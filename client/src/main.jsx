import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import App from './App'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Menu_temp from './pages/Menu_temp'
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
      { path: 'gallery', element: <Gallery /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'contact', element: <Contact /> },

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
