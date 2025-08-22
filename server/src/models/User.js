const { Schema, model } = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

// helper to set password
UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12)
}

// helper to verify password
UserSchema.methods.verifyPassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

module.exports = model('User', UserSchema)
