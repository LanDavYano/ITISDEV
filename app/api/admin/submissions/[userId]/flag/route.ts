import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isCycleOpen,
  getCurrentCycle,
  submissionStatus,
  writeAuditLog,
} from "@/lib/performance"

/**
 * POST /api/admin/submissions/[userId]/flag — flag (or unflag) a member's
 * entry for the current cycle for further review.
 *
 * Body: { flagged: boolean, reason?: string }  (reason required when flagging)
 * Every flag/unflag is audit-logged. Locked once the evaluation is finalized.
 * Access: roleLevel 3, or roleLevel 2 for members of their own sub-department.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User, PerformanceRecord } = require("@/database")
    await connectDB()

    // Level-2 scope check: own sub-department only.
    if (session.user.roleLevel === 2) {
      const [me, target] = await Promise.all([
        User.findById(session.user.id).select("subDepartment"),
        User.findById(params.userId).select("subDepartment"),
      ])
      const sameTeam =
        me?.subDepartment &&
        target?.subDepartment &&
        me.subDepartment.toString() === target.subDepartment.toString()
      if (!sameTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const cycle = await getCurrentCycle()
    if (!cycle) return NextResponse.json({ error: "No active cycle found" }, { status: 404 })
    if (!isCycleOpen(cycle)) {
      return NextResponse.json(
        { error: "The evaluation is finalized. Entries are locked." },
        { status: 403 }
      )
    }

    const record = await PerformanceRecord.findOne({
      user: params.userId,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })
    if (!record || !record.submittedAt) {
      return NextResponse.json(
        { error: "This member has no submitted entry to flag for the current cycle." },
        { status: 404 }
      )
    }

    const body = await req.json()
    const flagged = Boolean(body.flagged)
    const reason = typeof body.reason === "string" ? body.reason.trim() : ""

    if (flagged && !reason) {
      return NextResponse.json(
        { error: "A reason is required when flagging an entry." },
        { status: 400 }
      )
    }

    record.isFlagged = flagged
    record.flagReason = flagged ? reason : null
    record.flaggedBy = flagged ? session.user.id : null
    record.flaggedAt = flagged ? new Date() : null
    await record.save()

    await writeAuditLog({
      record,
      actor: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      },
      action: flagged ? "flag" : "unflag",
      note: flagged ? reason : null,
    })

    return NextResponse.json({ record, status: submissionStatus(record) })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update flag" },
      { status: 500 }
    )
  }
}
