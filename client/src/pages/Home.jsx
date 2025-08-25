import Hero from '../components/blocks/Hero'
import Countdown from '../components/blocks/Countdown'
import EventCard from '../components/blocks/EventCard'
import { getEvents } from '../lib/content'
import { useEffect, useState } from 'react'
import { CalendarDays, Images, UtensilsCrossed } from 'lucide-react'

export default function Home() {
  const [events, setEvents] = useState([])
  useEffect(() => { getEvents().then(setEvents) }, [])

  const featured = events[0]

  return (
    <div>
      <Hero
        headline="Your Community Pub in Barkham"
        subhead="Barkham's Table Since Victorian Times."
        ctas={[
          { label: "See Events", href: "/events" },
          { label: "Book a Table", href: "/bookings" }
        ]}
        bgImage="/images/hero/pub-exterior.jpg"   // 👈 in /public/images/hero/
        rightImage="/images/hero/pub-interior.jpg" // 👈 in /public/images/hero/
        rightImageAlt="Inside The Bull Barkham pub"
      />



      {featured && (
        <section className="section">
          <div className="container-outer">
            <div className="flex items-center justify-between mb-6">
              <h2 className="h2">Featured Event</h2>
              <div className="flex items-center gap-2 text-sm text-black/70">
                <CalendarDays size={16} /> {featured.date} • {featured.time}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <EventCard e={featured} />
              <div className="rounded-lg bg-white p-6 shadow-card">
                <p className="mb-4 text-sm text-black/70">Countdown to {featured.title}</p>
                <Countdown targetDate={`${featured.date}T${featured.time}:00`} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section bg-white">
        <div className="container-outer grid md:grid-cols-3 gap-6">
          {[
            { icon: <CalendarDays />, title: 'Whats On Bull', desc: 'Food, Karaoke, Live Musics' , href:'/events'},
            { icon: <UtensilsCrossed />, title: 'Food Menu', desc: '' , href:'/menu'},
            { icon: <Images />, title: 'Gallery', desc: 'See the vibe from recent nights', href:'/gallery'}
          ].map((f, i) => (
            <a key={i} href={f.href} className="card p-6">
              <div className="h-10 w-10 grid place-items-center rounded-md bg-bull-green/10 mb-3">{f.icon}</div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-black/70">{f.desc}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
