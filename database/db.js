/**
 * MongoDB connection helper (Mongoose).
 *
 * Replaces the previous MySQL setup. The connection string is read from the
 * MONGODB_URI environment variable (see .env.local / .env.example).
 *
 * Uses a cached global connection so that Next.js hot-reloading in development
 * does not open a new connection on every request, while still working when
 * called from a one-off script such as `node model/seed.js`.
 */

const mongoose = require("mongoose")

// Load environment variables when run as a standalone Node script.
// (Next.js loads .env files automatically, so this is a no-op there.)
try {
  require("dotenv").config({ path: ".env.local" })
  require("dotenv").config() // fall back to .env
} catch (_) {
  /* dotenv is optional at runtime inside Next.js */
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aiesec_dlsu"

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  )
}

// Reuse the connection across hot reloads / repeated imports.
let cached = global._mongoose
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // Mongoose 8/9 ignores the legacy flags; these are safe defaults.
        autoIndex: true,
      })
      .then((m) => {
        console.log(`[db] Connected to MongoDB → ${MONGODB_URI}`)
        return m
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}

async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect()
    cached.conn = null
    cached.promise = null
  }
}

module.exports = { connectDB, disconnectDB, mongoose, MONGODB_URI }
