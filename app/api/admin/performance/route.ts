import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PerformanceRecord = require("@/database/PerformanceRecord")

    await connectDB()

    // Get the most recent cycle (open or closed)
    const cycle = await EvaluationCycle.findOne()
      .sort({ submissionDeadline: -1 })
      .lean()

    if (!cycle) return NextResponse.json({})

    const records = await PerformanceRecord.find({
      periodMonth: (cycle as any).periodMonth,
      periodYear:  (cycle as any).periodYear,
    }).lean()

    const map: Record<string, {
      quantitativeRating: number | null
      deliverablesAssigned: number
      deliverablesAnswered: number
      meetingsTotal: number
      meetingsAttended: number
    }> = {}

    for (const r of records as any[]) {
      map[r.user.toString()] = {
        quantitativeRating:   r.quantitativeRating,
        deliverablesAssigned: r.deliverablesAssigned,
        deliverablesAnswered: r.deliverablesAnswered,
        meetingsTotal:        r.meetingsTotal,
        meetingsAttended:     r.meetingsAttended,
      }
    }

    return NextResponse.json(map)
  } catch {
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}
