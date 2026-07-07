import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function withState(cycle: any) {
  const now = new Date()
  const deadline = new Date(cycle.submissionDeadline)
  const isOpen = !cycle.isArchived && !cycle.isManuallyClosed && now <= deadline
  const isDeadlineClosed = !cycle.isArchived && !cycle.isManuallyClosed && now > deadline
  const canExtend = isDeadlineClosed && now.getTime() <= deadline.getTime() + 3 * 24 * 60 * 60 * 1000
  return { ...cycle.toObject(), isOpen, isDeadlineClosed, canExtend }
}

// APMP-60: Adjust deadline — APMP-61: reject past dates — APMP-63: re-enables editing if extended
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { submissionDeadline } = await req.json()
    const newDeadline = new Date(submissionDeadline)

    if (Number.isNaN(newDeadline.getTime())) {
      return NextResponse.json({ error: "Invalid deadline format" }, { status: 400 })
    }

    // APMP-61: Cannot set a past date
    if (newDeadline <= new Date()) {
      return NextResponse.json({ error: "Deadline must be a future date" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycle = await EvaluationCycle.findById(params.id)

    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

    if (cycle.isArchived) {
      return NextResponse.json({ error: "Archived cycles cannot be adjusted" }, { status: 400 })
    }

    // Deadline-closed cycles must use /extend within the 3-day window.
    if (!cycle.isManuallyClosed && new Date() > new Date(cycle.submissionDeadline)) {
      return NextResponse.json(
        { error: "Cycle is closed by deadline. Use extend option within 3 days." },
        { status: 400 }
      )
    }

    const targetMonth = MONTHS[newDeadline.getMonth()]
    const targetYear = newDeadline.getFullYear()

    const conflictingCycle = await EvaluationCycle.findOne({
      _id: { $ne: cycle._id },
      periodMonth: targetMonth,
      periodYear: targetYear,
      isArchived: false,
    })

    if (conflictingCycle) {
      return NextResponse.json({ error: "A cycle for this period already exists" }, { status: 409 })
    }

    cycle.submissionDeadline = newDeadline
    cycle.periodMonth = targetMonth
    cycle.periodYear = targetYear
    await cycle.save()

    return NextResponse.json(withState(cycle))
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A cycle for this period already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to update deadline" }, { status: 500 })
  }
}
