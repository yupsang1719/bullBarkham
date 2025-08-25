// client/src/pages/Gallery.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { getGallery } from '../lib/content'

function classNames(...a){ return a.filter(Boolean).join(' ') }

export default function Gallery() {
  const [data, setData] = useState({ categories: [] })
  const [active, setActive] = useState('all') // 'all' or category name
  const [lightbox, setLightbox] = useState({ open: false, catIndex: 0, imgIndex: 0 })

  useEffect(() => { getGallery().then(setData) }, [])

  const categories = data.categories || []
  const allImagesFlat = useMemo(() => {
    // build an array of {catIndex, imgIndex, src}
    const out = []
    categories.forEach((c, ci) => c.images.forEach((src, ii) => out.push({ catIndex: ci, imgIndex: ii, src })))
    return out
  }, [categories])

  const visibleCategories = useMemo(() => {
    if (active === 'all') return categories
    return categories.filter(c => c.name === active)
  }, [active, categories])

  // Lightbox controls
  const openLightbox = useCallback((catIndex, imgIndex) => {
    setLightbox({ open: true, catIndex, imgIndex })
    document.body.style.overflow = 'hidden'
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(l => ({ ...l, open: false }))
    document.body.style.overflow = ''
  }, [])

  const goPrev = useCallback(() => {
    const flatIndex = flatFromCI(lightbox, categories)
    const prev = (flatIndex - 1 + allImagesFlat.length) % allImagesFlat.length
    const { catIndex, imgIndex } = ciFromFlat(prev, categories)
    setLightbox({ open: true, catIndex, imgIndex })
  }, [lightbox, categories, allImagesFlat.length])

  const goNext = useCallback(() => {
    const flatIndex = flatFromCI(lightbox, categories)
    const next = (flatIndex + 1) % allImagesFlat.length
    const { catIndex, imgIndex } = ciFromFlat(next, categories)
    setLightbox({ open: true, catIndex, imgIndex })
  }, [lightbox, categories, allImagesFlat.length])

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox.open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox.open, goPrev, goNext, closeLightbox])

  return (
    <section className="section">
      <div className="container-outer">
        <header className="mb-5 sm:mb-6">
          <h1 className="h1 mb-3">Gallery</h1>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              className={classNames('tab-pill', active === 'all' && 'tab-pill--active')}
              onClick={() => setActive('all')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                className={classNames('tab-pill', active === c.name && 'tab-pill--active')}
                onClick={() => setActive(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </header>

        {/* Category sections */}
        <div className="space-y-10">
          {visibleCategories.map((cat, ci) => (
            <div key={cat.name}>
              {active !== 'all' ? null : (
                <h2 className="text-xl font-serif mb-4">{cat.name}</h2>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {cat.images.map((src, ii) => (
                  <ImageTile
                    key={`${cat.name}-${ii}`}
                    src={src}
                    title={`${cat.name} ${ii + 1}`}
                    onClick={() => openLightbox(categories.indexOf(cat), ii)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {visibleCategories.length === 0 && (
            <div className="text-center text-black/60 py-16">No images yet.</div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox.open && (
        <Lightbox
          src={categories[lightbox.catIndex]?.images[lightbox.imgIndex]}
          caption={`${categories[lightbox.catIndex]?.name || ''}`}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </section>
  )
}

/* ---- helpers to convert between flat index and {catIndex, imgIndex} --- */
function flatFromCI({ catIndex, imgIndex }, categories) {
  let idx = 0
  for (let i = 0; i < categories.length; i++) {
    const len = categories[i].images.length
    if (i === catIndex) return idx + imgIndex
    idx += len
  }
  return 0
}
function ciFromFlat(flatIndex, categories) {
  let idx = flatIndex
  for (let i = 0; i < categories.length; i++) {
    const len = categories[i].images.length
    if (idx < len) return { catIndex: i, imgIndex: idx }
    idx -= len
  }
  return { catIndex: 0, imgIndex: 0 }
}

/* -------------------- Presentational components -------------------- */

function ImageTile({ src, title, onClick }) {
  const [ok, setOk] = useState(true)
  return (
    <button
      className="group relative block w-full aspect-[4/3] overflow-hidden rounded-lg bg-black/[.06] border border-black/10"
      onClick={onClick}
      title={title}
    >
      {ok ? (
        <img
          src={src}
          alt={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          onError={() => setOk(false)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-xs text-black/50 px-2">
          Missing image
        </div>
      )}

      {/* subtle overlay on hover */}
      <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  )
}

function Lightbox({ src, caption, onClose, onPrev, onNext }) {
  if (!src) return null
  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Frame */}
      <div className="absolute inset-0 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 h-12 text-white/90">
          <div className="text-sm sm:text-base">{caption}</div>
          <div className="flex items-center gap-2">
            <button className="lb-btn" onClick={onPrev} aria-label="Previous">‹</button>
            <button className="lb-btn" onClick={onNext} aria-label="Next">›</button>
            <button className="lb-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        {/* Image area */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6">
          <img
            src={src}
            alt={caption}
            className="max-h-full max-w-full object-contain rounded-md shadow-2xl"
          />
        </div>
      </div>
    </div>
  )
}
