import { getToken } from '../../lib/admin'
import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const token = getToken()
  const loc = useLocation()
  if (!token) return <Navigate to="/admin" replace state={{ from: loc.pathname }} />
  return children
}
