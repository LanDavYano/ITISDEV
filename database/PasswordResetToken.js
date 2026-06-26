const { mongoose } = require("./db")

const passwordResetTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["otp", "reset"],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0, // TTL index — MongoDB auto-deletes expired docs at expiresAt
  },
})

module.exports =
  mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", passwordResetTokenSchema)
