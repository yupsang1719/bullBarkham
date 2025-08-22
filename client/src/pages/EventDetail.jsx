import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvent } from '../lib/content'
import Countdown from '../components/blocks/Countdown'

export default function EventDetail() {
  const { slug } = useParams()
  const [event, setEvent] = useState(null)

  useEffect(() => { getEvent(slug).then(setEvent) }, [slug])

  if (!event) return <div className="section container-outer">Loading…</div>

  return (
    <section className="section">
      <div className="container-outer grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="h1">{event.title}</h1>
          <p className="text-black/70 mb-4">{event.date} • {event.time}</p>
          <div className="rounded-lg bg-white h-60 mb-6 shadow-card" />
          <p>{event.summary}</p>
        </div>
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="text-sm text-black/70 mb-2">Starts in</div>
            <Countdown targetDate={`${event.date}T${event.time}:00`} />
          </div>
          <a href="/bookings" className="btn btn-primary w-full">Book a Table</a>
        </aside>
      </div>
    </section>
  )
}
