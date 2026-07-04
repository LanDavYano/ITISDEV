import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Role } = require("@/database")
    await connectDB()
    const roles = await Role.find().sort({ level: 1 }).lean()
    return NextResponse.json({ roles })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
