import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycles = await EvaluationCycle.find()
      .sort({ periodYear: -1, submissionDeadline: -1 })
      .populate("createdBy", "firstName lastName email")
      .lean()

    const now = new Date()
    return NextResponse.json(
      cycles.map((c: any) => ({ ...c, isOpen: now <= new Date(c.submissionDeadline) }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch cycles" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { periodMonth, periodYear, submissionDeadline } = await req.json()

    // APMP-61: Deadline must be in the future
    if (new Date(submissionDeadline) <= new Date()) {
      return NextResponse.json({ error: "Deadline must be a future date" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycle = await EvaluationCycle.create({
      periodMonth,
      periodYear,
      submissionDeadline: new Date(submissionDeadline),
      createdBy: session.user.id,
    })

    return NextResponse.json({ ...cycle.toObject(), isOpen: true }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A cycle for this period already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 })
  }
}
