import { NextResponse } from "next/server"

// Returns the most recently created cycle (open or closed) — APMP-59
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycle = await EvaluationCycle.findOne()
      .sort({ periodYear: -1, submissionDeadline: -1 })
      .lean()

    if (!cycle) return NextResponse.json(null)

    const now = new Date()
    return NextResponse.json({
      ...cycle,
      isOpen: now <= new Date(cycle.submissionDeadline),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch current cycle" }, { status: 500 })
  }
}
