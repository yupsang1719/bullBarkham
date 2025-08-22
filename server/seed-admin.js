require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./src/models/User')

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Mongo connected')

    const email = process.argv[2] || 'thenngbirash124@gmail.com'
    const password = process.argv[3] || 'barkham1719'
    const name = process.argv[4] || 'Bull Admin'

    let user = await User.findOne({ email: email.toLowerCase() })
    if (user) {
      console.log('User exists, updating password and name')
      user.name = name
      await user.setPassword(password)
      await user.save()
    } else {
      user = new User({ email: email.toLowerCase(), name, role: 'admin' })
      await user.setPassword(password)
      await user.save()
    }
    console.log(`✅ Admin ready: ${email}`)
  } catch (e) {
    console.error(e)
  } finally {
    await mongoose.disconnect()
  }
}

run()
