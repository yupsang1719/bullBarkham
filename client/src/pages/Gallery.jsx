import { useEffect, useState } from 'react'
import { getGallery } from '../lib/content'

export default function Gallery() {
  const [data, setData] = useState({ categories: [] })
  useEffect(() => { getGallery().then(setData) }, [])

  return (
    <section className="section">
      <div className="container-outer">
        <h1 className="h1 mb-6">Gallery</h1>
        <div className="space-y-10">
          {data.categories.map(cat => (
            <div key={cat.name}>
              <h2 className="text-xl font-serif mb-4">{cat.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {cat.images.map((src, i) => (
                  <div key={i} className="aspect-[4/3] rounded-lg bg-bull-green/10" title={src} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
