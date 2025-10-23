// client/src/pages/ShowtimeMenu.jsx
import { useEffect, useMemo, useState } from 'react'
import { getShowtimeMenu } from '../lib/content'

/** Inline flourish */
function Flourish({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 318 24" aria-hidden="true">
      <path d="M0 12h110c8.5 0 12-6 20-6s11.5 6 20 6 12-6 20-6 11.5 6 20 6h128"
        fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function ShowtimeMenu() {
  const [data, setData] = useState({})
  useEffect(() => { getShowtimeMenu().then(setData) }, [])
  const sections = useMemo(() => Object.entries(data || {}), [data])

  const HERO_IMG = '../images/menu/Bull-334.jpg' // <- put your banner here

  return (
    <main>
      {/* HERO banner */}
      <section className="relative overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Quiz & Comedy Night at The Bull Barkham"
          className="w-full h-[34vh] sm:h-[42vh] object-cover"
          loading="eager"
          fetchpriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
        <div className="container-outer">
        </div>
      </section>

      {/* PAPER SHEET */}
      <section className="section">
        <div className="container-outer">
          <div className="paper-bg engraved-border px-5 sm:px-8 py-8 sm:py-10">
            {/* Header on paper */}
            <div className="text-center">
              <h2 className="victorian-title text-2xl sm:text-3xl tracking-wide">Quiz Night & Comedy Night Menu</h2>
              {/* <div className="mt-1 text-xs tracking-widest uppercase text-black/70">
                Choose any 3 for £10
              </div> */}
              <div className="my-5 text-black/60">
                <Flourish className="mx-auto h-5 w-56 text-black/40" />
              </div>
              <p className="text-black/70 max-w-xl mx-auto">
                Small plates perfect for sharing between rounds — ask your server about availability on the night.
              </p>
            </div>

            {/* Sections — centered if only one, grid if many */}
            <div className={sections.length > 1 ? 'grid md:grid-cols-2 gap-8 mt-6' : 'flex justify-center mt-6'}>
              {sections.length === 0 && (
                <div className="text-center text-black/60 py-8">Menu coming soon.</div>
              )}

              {sections.map(([title, items]) => (
                <article key={title} className="section-card max-w-lg w-full">
                  <header className="mb-3 text-center">
                    <h3 className="section-heading">{title}</h3>
                  </header>

                  <ul className="divide-y divide-black/10">
                    {items.map((it, i) => (
                      <li key={i} className="py-2">
                        <div className="flex flex-col">
                          <div className="item-line">
                            <span className="item-name">{it.name}</span>
                          </div>
                          {it.ingredients && (
                            <div className="mt-0.5 text-[13px] leading-snug text-black/70 italic">
                              {it.ingredients}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            {/* Back link */}
            <div className="mt-10 text-center">
              <a href="/menu" className="tab-pill">← Back to Main Menu</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
