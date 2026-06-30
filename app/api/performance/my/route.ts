import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PerformanceRecord = require("@/database/PerformanceRecord")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()

    const { searchParams } = new URL(req.url)
    const cycleId = searchParams.get("cycleId")

    let periodMonth: string, periodYear: number
    if (cycleId) {
      const cycle = await EvaluationCycle.findById(cycleId)
      if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
      periodMonth = cycle.periodMonth
      periodYear  = cycle.periodYear
    } else {
      const cycle = await EvaluationCycle.findOne().sort({ periodYear: -1, submissionDeadline: -1 })
      if (!cycle) return NextResponse.json(null)
      periodMonth = cycle.periodMonth
      periodYear  = cycle.periodYear
    }

    const record = await PerformanceRecord.findOne({
      user: session.user.id,
      periodMonth,
      periodYear,
    })

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 })
  }
}
