import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isCycleOpen,
  getCurrentCycle,
  validateAssignedCounts,
  diffFields,
  writeAuditLog,
  ASSIGNMENT_FIELDS,
} from "@/lib/performance"

/**
 * PATCH /api/team/records/[userId] — a team leader assigns/updates the
 * deliverable and meeting counts for one member of their sub-department for
 * the current cycle. Creates the record if the member hasn't submitted yet.
 *
 * Access: roleLevel 2 (own sub-department only) or roleLevel 3 (anyone).
 * Locked once the cycle is closed / finalized. Every change is audit-logged.
 */
export async function PATCH(
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

    const cycle = await getCurrentCycle()
    if (!cycle) return NextResponse.json({ error: "No active cycle found" }, { status: 404 })
    if (!isCycleOpen(cycle)) {
      return NextResponse.json(
        { error: "This cycle is closed. Assignments are locked." },
        { status: 403 }
      )
    }

    // Target must exist and be within the leader's scope.
    const target = await User.findById(params.userId)
      .select("subDepartment role")
      .populate("role", "level")
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    if (session.user.roleLevel === 2) {
      const me = await User.findById(session.user.id).select("subDepartment")
      const sameTeam =
        me?.subDepartment &&
        target.subDepartment &&
        me.subDepartment.toString() === target.subDepartment.toString()
      if (!sameTeam) {
        return NextResponse.json(
          { error: "You can only assign counts to members of your own sub-department." },
          { status: 403 }
        )
      }
    }

    const body = await req.json()

    // Whitelist + validate the four count fields.
    const updates: Record<string, number> = {}
    for (const field of ASSIGNMENT_FIELDS) {
      if (field in body) updates[field] = Number(body[field])
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No count fields provided." }, { status: 400 })
    }

    // Find-or-create the member's record for this cycle so counts can be
    // assigned before the member submits their goals/ratings.
    let record = await PerformanceRecord.findOne({
      user: params.userId,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })
    if (!record) {
      record = new PerformanceRecord({
        user: params.userId,
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      })
    }

    // Validate against the merged result (so partial updates are still checked
    // against the values already on the record).
    const merged = {
      deliverablesAssigned: updates.deliverablesAssigned ?? record.deliverablesAssigned,
      deliverablesAnswered: updates.deliverablesAnswered ?? record.deliverablesAnswered,
      meetingsTotal: updates.meetingsTotal ?? record.meetingsTotal,
      meetingsAttended: updates.meetingsAttended ?? record.meetingsAttended,
    }
    const validationError = validateAssignedCounts(merged)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const changes = diffFields(record, updates, [...ASSIGNMENT_FIELDS])
    Object.assign(record, updates)
    await record.save()

    if (changes.length > 0) {
      await writeAuditLog({
        record,
        actor: {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        },
        action: "assign",
        changes,
      })
    }

    return NextResponse.json(record)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to assign counts" },
      { status: 500 }
    )
  }
}
