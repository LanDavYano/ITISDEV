import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function withState(cycle: any) {
  const now = new Date()
  const deadline = new Date(cycle.submissionDeadline)
  const isOpen = !cycle.isArchived && !cycle.isManuallyClosed && now <= deadline
  const isDeadlineClosed = !cycle.isArchived && !cycle.isManuallyClosed && now > deadline
  const canExtend = isDeadlineClosed && now.getTime() <= deadline.getTime() + MS_3_DAYS
  return { ...cycle.toObject(), isOpen, isDeadlineClosed, canExtend }
}

// Extends a deadline-closed cycle only within 3 days after deadline.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { submissionDeadline } = await req.json()
    const newDeadline = new Date(submissionDeadline)

    if (Number.isNaN(newDeadline.getTime())) {
      return NextResponse.json({ error: "Invalid deadline format" }, { status: 400 })
    }

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
      return NextResponse.json({ error: "Cycle is archived and can no longer be extended" }, { status: 400 })
    }

    if (cycle.isManuallyClosed) {
      return NextResponse.json({ error: "Manually closed cycles should be reopened, not extended" }, { status: 400 })
    }

    const now = new Date()
    const currentDeadline = new Date(cycle.submissionDeadline)

    if (now <= currentDeadline) {
      return NextResponse.json({ error: "Cycle is still open. Use adjust deadline instead." }, { status: 400 })
    }

    if (now.getTime() > currentDeadline.getTime() + MS_3_DAYS) {
      cycle.isArchived = true
      cycle.archivedAt = now
      await cycle.save()
      return NextResponse.json(
        { error: "3-day extension window has passed. Cycle was archived." },
        { status: 400 }
      )
    }

    cycle.submissionDeadline = newDeadline

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

    cycle.periodMonth = targetMonth
    cycle.periodYear = targetYear
    await cycle.save()

    return NextResponse.json(withState(cycle))
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A cycle for this period already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to extend deadline" }, { status: 500 })
  }
}
