import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// APMP-62: Block new submissions after deadline
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PerformanceRecord = require("@/database/PerformanceRecord")

    await connectDB()

    const cycle = await EvaluationCycle.findOne().sort({ periodYear: -1, submissionDeadline: -1 })
    if (!cycle) return NextResponse.json({ error: "No active cycle found" }, { status: 404 })

    // APMP-62: Deadline passed — block new submissions
    if (new Date() > new Date(cycle.submissionDeadline)) {
      return NextResponse.json({ error: "Submission deadline has passed. New entries are not allowed." }, { status: 403 })
    }

    const body = await req.json()
    const record = await PerformanceRecord.create({
      user:        session.user.id,
      periodMonth: cycle.periodMonth,
      periodYear:  cycle.periodYear,
      ...body,
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "You already have a submission for this period" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || "Failed to submit" }, { status: 500 })
  }
}
