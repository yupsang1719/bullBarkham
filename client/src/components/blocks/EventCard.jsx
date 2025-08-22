import { Link } from 'react-router-dom'

export default function EventCard({ e }) {
  return (
    <div className="card overflow-hidden">
      <div className="h-40 bg-bull-green/10" aria-hidden />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {e.badges?.map(b => <span key={b} className="badge">{b}</span>)}
        </div>
        <h3 className="font-medium text-lg">{e.title}</h3>
        <p className="text-sm text-black/70">{e.summary}</p>
        <div className="text-sm text-black/70">{e.date} • {e.time}</div>
        <Link to={`/events/${e.slug}`} className="btn btn-ghost">{e.cta?.label || 'View Details'}</Link>
      </div>
    </div>
  )
}
