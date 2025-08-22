// server/seed.js
require('dotenv').config()
const mongoose = require('mongoose')
const Event = require('./src/models/Event')

const seedEvents = [
  {
    title: "Live Band Saturday",
    slug: "live-band-saturday-2025-09-06",
    date: "2025-09-06",
    time: "19:30",
    tags: ["Live Music", "Saturday"],
    cover: "/images/events/live-band.jpg",
    badges: ["Major", "Tickets Soon"],
    summary: "A fab night with rotating bands and a buzzing dance floor.",
    isMajor: true,
  },
  {
    title: "Rainbow Karaoke Friday",
    slug: "rainbow-karaoke-friday-2025-09-05",
    date: "2025-09-05",
    time: "20:00",
    tags: ["Karaoke", "Friday"],
    cover: "/images/events/karaoke.jpg",
    badges: ["Community Favourite"],
    summary: "Bring the vocals and the vibes — everyone is welcome!",
    isMajor: false,
  },
  {
    title: "Sunday Roast & Acoustic",
    slug: "sunday-roast-acoustic-2025-09-07",
    date: "2025-09-07",
    time: "14:00",
    tags: ["Food", "Acoustic", "Sunday"],
    cover: "/images/events/roast.jpg",
    badges: ["Food Special"],
    summary: "Delicious Sunday roast with mellow acoustic background tunes.",
    isMajor: false,
  }
]

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { autoIndex: true })
    console.log("Mongo connected")

    // wipe previous events (optional)
    await Event.deleteMany({})
    console.log("Cleared old events")

    // insert new ones
    const inserted = await Event.insertMany(seedEvents)
    console.log(`✅ Inserted ${inserted.length} events`)
  } catch (err) {
    console.error("❌ Error seeding data", err)
  } finally {
    mongoose.disconnect()
  }
}

run()
