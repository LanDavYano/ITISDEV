import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000

function withState(cycle: any) {
  const now = new Date()
  const deadline = new Date(cycle.submissionDeadline)
  const isOpen = !cycle.isArchived && !cycle.isManuallyClosed && now <= deadline
  const isDeadlineClosed = !cycle.isArchived && !cycle.isManuallyClosed && now > deadline
  const canExtend = isDeadlineClosed && now.getTime() <= deadline.getTime() + MS_3_DAYS
  return { ...cycle.toObject(), isOpen, isDeadlineClosed, canExtend }
}

// Manually closes a cycle so no new submissions or edits can be made.
export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()

    const cycle = await EvaluationCycle.findById(params.id)
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

    if (cycle.isArchived) {
      return NextResponse.json({ error: "Archived cycles cannot be changed" }, { status: 400 })
    }

    if (new Date() > new Date(cycle.submissionDeadline)) {
      return NextResponse.json(
        { error: "Cycle is already closed by deadline. Use extend within 3 days if eligible." },
        { status: 400 }
      )
    }

    if (cycle.isManuallyClosed) {
      return NextResponse.json({ error: "Cycle is already closed" }, { status: 409 })
    }

    cycle.isManuallyClosed = true
    cycle.closedAt = new Date()
    cycle.closedBy = session.user.id
    await cycle.save()

    const { logAdminActivity } = await import("@/lib/activity-log")
    await logAdminActivity({
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      category: "Deadline Management",
      action: "close",
      description: `Manually closed the ${cycle.periodMonth} ${cycle.periodYear} evaluation cycle`,
      targetType: "EvaluationCycle",
      targetId: cycle._id.toString(),
      targetLabel: `${cycle.periodMonth} ${cycle.periodYear}`,
    })

    return NextResponse.json(withState(cycle))
  } catch {
    return NextResponse.json({ error: "Failed to close cycle" }, { status: 500 })
  }
}
