// client/src/pages/AboutHybrid.jsx
import { ABOUT_PUB as DATA } from '../data/aboutPub'

function Flourish({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 318 24" aria-hidden="true">
      <path d="M0 12h110c8.5 0 12-6 20-6s11.5 6 20 6 12-6 20-6 11.5 6 20 6h128"
            fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function AboutHybrid() {
  return (
    <main>
      {/* HERO — modern, accessible, mobile‑first */}
      <section className="relative overflow-hidden">
        <div className="hy-hero-wrap">
          <img
            src={DATA.heroImage}
            alt="The Bull Barkham exterior"
            loading="eager"
            fetchpriority="high"
            className="hy-hero-img"
          />
          <div className="hy-hero-scrim" />
        </div>

        <div className="container-outer">
          <div className="hy-hero-content">
            <h1 className="hy-title">{DATA.heroTitle}</h1>
            <p className="hy-sub">{DATA.heroIntro}</p>
          </div>
        </div>
      </section>

      {/* INTRO + STORY */}
      <section className="section py-8 sm:py-10">
        <div className="container-outer grid gap-6 md:grid-cols-5 md:gap-8 items-start">
          <div className="md:col-span-3">
            <div className="hy-card hy-card--engraved">
              <h2 className="hy-h2">Our Story</h2>
              {DATA.story.map((p, i) => (
                <p key={i} className="hy-body mt-3 first:mt-0">{p}</p>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="hy-card">
              <h3 className="hy-eyebrow">Since Victorian Times</h3>
              <p className="hy-body mt-2">
                Grade II‑listed building • working inglenook • etched glass.
                Once a smithy (1728–1982), now a warm dining space.
              </p>
              <Flourish className="h-4 w-40 text-black/30 mt-4 hidden sm:block" />
              <ul className="mt-4 space-y-2 hy-list">
                <li>🍽 Seasonal menus & roasts</li>
                <li>🍺 Cask ales & proper pours</li>
                <li>🎶 Live music & events</li>
                <li>🤝 Family & dog‑friendly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-6 sm:py-8">
        <div className="container-outer">
          <h2 className="hy-h2 text-center">What We Stand For</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
            {DATA.values.map((v, i) => (
              <div key={i} className="hy-tile">
                <div className="text-xl sm:text-2xl">{v.icon}</div>
                <div className="font-semibold mt-0.5 sm:mt-1">{v.title}</div>
                <div className="hy-muted mt-0.5 sm:mt-1">{v.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-8 sm:py-10">
        <div className="container-outer">
          <div className="hy-timeline">
            <h2 className="hy-h2">Timeline</h2>
            <div className="hy-line" />
            <div className="hy-timeline-list">
              {DATA.timeline.map((item, idx) => (
                <article key={idx} className="hy-timeline-item">
                  <div className="hy-dot" aria-hidden="true">
                    <Flourish className="h-3 w-8 text-black/35 hidden sm:block" />
                  </div>
                  <div className="hy-year">{item.year}</div>
                  <div className="hy-timeline-card">
                    <div className="font-semibold">{item.title}</div>
                    <div className="hy-muted mt-1">{item.text}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-6 sm:mt-8">
            <a href="/events" className="hy-btn hy-btn--primary">What’s On</a>
            <a href="/bookings" className="hy-btn hy-btn--ghost ml-2">Book a Table</a>
          </div>
        </div>
      </section>
    </main>
  )
}
