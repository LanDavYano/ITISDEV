/**
 * Connection smoke test.
 *
 * Verifies that the code can reach the MongoDB instance defined by MONGODB_URI
 * and reports what it finds. Safe to run anytime — it only reads, never writes.
 *
 * Run with:  npm run db:check   (or: node database/check-connection.js)
 */

const path = require("path")
const { connectDB, disconnectDB, mongoose, MONGODB_URI } = require(
  path.join(__dirname, "index")
)

async function main() {
  console.log(`\n→ Connecting to: ${MONGODB_URI}`)
  const start = Date.now()

  await connectDB()

  const connected = mongoose.connection.readyState === 1
  console.log(`✅ Connection established in ${Date.now() - start}ms`)
  console.log(`   state:    ${connected ? "connected" : "NOT connected"}`)
  console.log(`   host:     ${mongoose.connection.host}:${mongoose.connection.port}`)
  console.log(`   database: ${mongoose.connection.name}`)

  // Ping the server and list what's there so you can see real data.
  await mongoose.connection.db.admin().ping()
  console.log("   ping:     ok")

  const collections = await mongoose.connection.db.listCollections().toArray()
  if (collections.length === 0) {
    console.log(
      "\n   (no collections yet — run `npm run seed` to populate the database)"
    )
  } else {
    console.log("\n   collections & document counts:")
    for (const c of collections) {
      const count = await mongoose.connection.db
        .collection(c.name)
        .countDocuments()
      console.log(`     - ${c.name}: ${count}`)
    }
  }

  console.log("\n🎉 Your code is talking to MongoDB.\n")
}

main()
  .then(() => disconnectDB())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("\n❌ Could not connect to MongoDB.")
    console.error(`   ${err.message}`)
    console.error(
      "\n   Checklist:" +
        "\n     1. Is MongoDB running?  brew services start mongodb-community" +
        "\n     2. Is MONGODB_URI correct in .env.local?" +
        "\n     3. Is something listening on port 27017?\n"
    )
    await disconnectDB().catch(() => {})
    process.exit(1)
  })
