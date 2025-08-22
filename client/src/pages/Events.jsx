import { useEffect, useState } from 'react'
import { getEvents } from '../lib/content'
import EventCard from '../components/blocks/EventCard'

export default function Events() {
  const [events, setEvents] = useState([])
  useEffect(() => { getEvents().then(setEvents) }, [])

  return (
    <section className="section">
      <div className="container-outer">
        <h1 className="h1 mb-6">Events</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(e => <EventCard key={e.slug} e={e} />)}
        </div>
      </div>
    </section>
  )
}
