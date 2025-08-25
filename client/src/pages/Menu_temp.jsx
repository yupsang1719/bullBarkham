// client/src/pages/Menu.jsx
import { useEffect, useState } from 'react'

export default function MenuTeaser() {
  const openingDate = new Date('2025-08-29T12:00:00') // adjust time if you want
  const [timeLeft, setTimeLeft] = useState(getRemaining())

  function getRemaining() {
    const now = new Date()
    const diff = openingDate - now
    if (diff <= 0) return null
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const mins = Math.floor((diff / (1000 * 60)) % 60)
    return { days, hours, mins }
  }

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getRemaining()), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="section min-h-[70vh] flex items-center">
      <div className="container-outer text-center max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">
          Something Delicious is Brewing…
        </h1>
        <p className="text-lg text-black/70 mb-6">
          Our **brand new Food Menu** is almost here!  
          Doors to flavour open on <strong>Friday 29th August</strong>.  
          Until then… the kitchen elves are sworn to secrecy. 🤫
        </p>

        {timeLeft ? (
          <div className="font-mono text-xl sm:text-2xl mb-6">
            ⏳ {timeLeft.days} days {timeLeft.hours}h {timeLeft.mins}m
          </div>
        ) : (
          <div className="text-xl font-semibold text-green-700 mb-6">
            It’s happening today! Come hungry. 🍴
          </div>
        )}

        <div className="space-y-2 text-black/70 text-sm">
          <p>🍔 Will there be towering burgers? Maybe.</p>
          <p>🍗 Sunday roasts that defeat even the bravest? Quite possibly.</p>
          <p>🍰 Desserts you’ll want to guard with your life? Oh yes.</p>
        </div>

        <p className="mt-6 text-lg font-medium">
          Stay curious, stay hungry — and see you on the 29th!
        </p>
      </div>
    </section>
  )
}
