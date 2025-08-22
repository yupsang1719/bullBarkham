import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, getToken } from '../../lib/admin'

export default function AdminEvents() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    if (!getToken()) return nav('/admin')
    adminApi.listEvents().then(setItems).catch(e => setError(e.message)).finally(()=>setLoading(false))
  }, [nav])

  const remove = async (id) => {
    if (!confirm('Delete this event?')) return
    await adminApi.deleteEvent(id)
    setItems(items.filter(i => i._id !== id))
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-700">{error}</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Events</h2>
        <Link to="/admin/events/new" className="btn btn-primary">Add Event</Link>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Time</th>
              <th className="py-2 pr-3">Slug</th>
              <th className="py-2 pr-3">Major</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(e => (
              <tr key={e._id} className="border-b">
                <td className="py-2 pr-3">{e.title}</td>
                <td className="py-2 pr-3">{e.date}</td>
                <td className="py-2 pr-3">{e.time}</td>
                <td className="py-2 pr-3">{e.slug}</td>
                <td className="py-2 pr-3">{e.isMajor ? 'Yes' : 'No'}</td>
                <td className="py-2 pr-3 text-right">
                  <Link to={`/admin/events/${e._id}`} className="link mr-3">Edit</Link>
                  <button className="link text-red-700" onClick={()=>remove(e._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="py-4 text-black/60">No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
