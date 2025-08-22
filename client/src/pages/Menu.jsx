import { useEffect, useMemo, useState } from 'react'
import { getMenu } from '../lib/content'

/** Small inline SVG dividers (Victorian flourish) */
function Flourish({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 318 24" aria-hidden="true">
      <path
        d="M0 12h110c8.5 0 12-6 20-6s11.5 6 20 6 12-6 20-6 11.5 6 20 6h128"
        fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** Map each menu section to a top tab */
const TAB_MAP = [
  { id: 'lunch',   label: 'Lunch',   match: /^Lunch /i },
  { id: 'main',    label: 'Main',    match: /^Main /i },
  { id: 'sunday',  label: 'Sunday Roast',  match: /^Sunday /i },
  { id: 'kids',    label: 'Children',match: /^Children/i },
]

// add near TAB_MAP / SECTION_ORDER
const TAB_SCHEDULE = {
  lunch:  'Tuesday – Saturday • 12:00 – 4:00 PM',
  main:   'Tuesday – Saturday • 6:00 – 10:00 PM',
  sunday: 'Sunday • 12:00 – 5:00 PM',
  kids:   'Available during all sessions'
}

/** Nicely sort sections inside each tab */
const SECTION_ORDER = [
  'Grazing', 'Starters', 'Mains', 'Sides', 'Desserts', 'Served With',
  'Home Baked Baguettes', 'Other Plates', 'Mains (Deal £8 incl. pudding & Fruit Shoot)', 'Desserts'
]

export default function Menu() {
  const [menu, setMenu] = useState({})
  const [active, setActive] = useState('main')

  useEffect(() => {
    getMenu().then((data) => {
      setMenu(data || {})
      // if lunch exists and you’re on lunch hours, auto-select lunch (optional)
      // setActive(data && Object.keys(data).some(k => /^Lunch /.test(k)) ? 'lunch' : 'main')
    })
  }, [])

  const tabs = useMemo(() => TAB_MAP.filter(t => Object.keys(menu).some(k => t.match.test(k))), [menu])

  const sectionsForActive = useMemo(() => {
    const entries = Object.entries(menu).filter(([title]) => {
      const tab = TAB_MAP.find(t => t.id === active)
      return tab ? tab.match.test(title) : true
    })

    // sort sections by SECTION_ORDER where possible
    const indexOf = (title) => {
      const clean = title.replace(/^(\w+)\s—\s/, '').trim() // strip "Main — Starters"
      const idx = SECTION_ORDER.findIndex(s => clean.startsWith(s))
      return idx === -1 ? 999 : idx
    }
    return entries.sort((a, b) => indexOf(a[0]) - indexOf(b[0]))
  }, [menu, active])

  return (
    <section className="section">
      <div className="container-outer">
        {/* Paper sheet */}
        <div className="paper-bg engraved-border px-5 sm:px-8 py-8 sm:py-10 print:p-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="victorian-title text-3xl sm:text-4xl tracking-wide">The Bull Barkham</h1>
            <div className="mt-1 text-xs tracking-widest uppercase text-black/70">Food & Provisions</div>
            <div className="my-5 text-black/60">
              <Flourish className="mx-auto h-5 w-56 text-black/40" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6">
            {tabs.map(t => (
              <button
                key={t.id}
                className={[
                  'tab-pill',
                  active === t.id ? 'tab-pill--active' : ''
                ].join(' ')}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-center mb-6">
            <div className="tab-subtitle">{TAB_SCHEDULE[active] || ''}</div>
            <Flourish className="mx-auto h-4 w-40 text-black/30 mt-2" />
          </div>

          {/* Sections */}
          <div className="grid md:grid-cols-2 gap-8">
            {sectionsForActive.map(([sectionTitle, items]) => (
              <article key={sectionTitle} className="section-card">
                <header className="mb-3">
                  <h2 className="section-heading">{sectionTitle}</h2>
                  <Flourish className="h-4 w-40 text-black/30" />
                </header>

                <ul className="divide-y divide-black/10">
                  {items.map((it, i) => (
                    <li key={i} className="py-2">
                      <div className="flex items-baseline gap-3">
                        {/* Name + badge */}
                        <div className="flex-1">
                          <div className="item-line">
                            <span className="item-name">{it.name}</span>
                            <span className="dot-leader" aria-hidden="true" />
                            <span className="item-price">{it.price}</span>
                          </div>
                          {it.ingredients && (
                            <div className="mt-0.5 text-[13px] leading-snug text-black/70 italic">
                              {it.ingredients}
                            </div>
                          )}
                        </div>
                        {/* Badge */}
                        {it.badge && (
                          <span className="ml-1 inline-block text-2xs px-2 py-0.5 rounded-full border border-black/20 text-black/70 bg-white/50">
                            {it.badge}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-10 text-center text-xs text-black/60">
            Prices include VAT. Please inform us of allergies. Some dishes can be prepared <em>vegan</em> — ask your server.
          </div>
        </div>
      </div>
    </section>
  )
}
