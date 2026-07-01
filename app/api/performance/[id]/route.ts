import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// APMP-62: Block edits after deadline — APMP-63: re-enables if deadline extended
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    // APMP-62 / APMP-63: If deadline passed, editing is locked.
    // If admin extended the deadline past now, this check passes again automatically.
    if (new Date() > new Date(cycle.submissionDeadline)) {
      return NextResponse.json(
        { error: "Submission deadline has passed. Editing is locked." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const record = await PerformanceRecord.findOneAndUpdate(
      { _id: params.id, user: session.user.id },
      body,
      { new: true, runValidators: true }
    )

    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    return NextResponse.json(record)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}
