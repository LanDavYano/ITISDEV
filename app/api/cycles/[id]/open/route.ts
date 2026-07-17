import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTH_TO_INDEX = Object.fromEntries(MONTHS.map((m, i) => [m, i])) as Record<string, number>

function isPastPeriod(cycle: any) {
  const now = new Date()
  const monthIndex = MONTH_TO_INDEX[cycle.periodMonth]
  const nowMonth = now.getMonth()
  const nowYear = now.getFullYear()
  return cycle.periodYear < nowYear || (cycle.periodYear === nowYear && monthIndex < nowMonth)
}

// Reopens a manually closed cycle so submissions are allowed again.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: "Archived cycles cannot be reopened" }, { status: 400 })
    }

    if (!cycle.isManuallyClosed) {
      return NextResponse.json(
        { error: "Only manually closed cycles can be reopened" },
        { status: 400 }
      )
    }

    if (isPastPeriod(cycle)) {
      return NextResponse.json(
        { error: "Past-month cycles cannot be reopened" },
        { status: 400 }
      )
    }

    if (new Date(cycle.submissionDeadline) <= new Date()) {
      return NextResponse.json(
        { error: "Cycles closed by deadline cannot be reopened. Use extend within 3 days if eligible." },
        { status: 400 }
      )
    }

    cycle.isManuallyClosed = false
    cycle.closedAt = null
    cycle.closedBy = null
    await cycle.save()

    const { logAdminActivity } = await import("@/lib/activity-log")
    await logAdminActivity({
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      category: "Deadline Management",
      action: "open",
      description: `Reopened the ${cycle.periodMonth} ${cycle.periodYear} evaluation cycle`,
      targetType: "EvaluationCycle",
      targetId: cycle._id.toString(),
      targetLabel: `${cycle.periodMonth} ${cycle.periodYear}`,
    })

    return NextResponse.json({ ...cycle.toObject(), isOpen: true })
  } catch {
    return NextResponse.json({ error: "Failed to open cycle" }, { status: 500 })
  }
}