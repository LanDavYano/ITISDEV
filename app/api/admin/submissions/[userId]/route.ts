import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isCycleOpen,
  getCurrentCycle,
  cycleSummary,
  submissionStatus,
  validateAssignedCounts,
  diffFields,
  writeAuditLog,
  MEMBER_FIELDS,
  ASSIGNMENT_FIELDS,
} from "@/lib/performance"

/** Shared guard: session must be admin-level; level 2 limited to own sub-department. */
async function authorize(session: any, targetUserId: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { User } = require("@/database")

  if (!session) return { error: "Unauthorized", status: 401 }
  if ((session.user.roleLevel ?? 1) < 2) return { error: "Forbidden", status: 403 }

  const target = await User.findById(targetUserId)
    .populate("role", "title level")
    .populate("department", "name officeType")
    .populate("subDepartment", "name")
  if (!target) return { error: "Member not found", status: 404 }

  if (session.user.roleLevel === 2) {
    const me = await User.findById(session.user.id).select("subDepartment")
    const sameTeam =
      me?.subDepartment &&
      target.subDepartment &&
      me.subDepartment._id.toString() === target.subDepartment._id.toString()
    if (!sameTeam) return { error: "Forbidden", status: 403 }
  }

  return { target }
}

/**
 * GET /api/admin/submissions/[userId] — full detail of one member's entry for
 * the current cycle: member info, the record (or null), cycle state, and the
 * audit trail of every admin edit / flag / team-leader assignment.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord, AuditLog } = require("@/database")
    await connectDB()

    const auth = await authorize(session, params.userId)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const cycle = await getCurrentCycle()

    let record = null
    let auditLogs: any[] = []
    if (cycle) {
      record = await PerformanceRecord.findOne({
        user: params.userId,
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      }).lean()
      if (record) {
        auditLogs = await AuditLog.find({ record: (record as any)._id })
          .sort({ createdAt: -1 })
          .lean()
      }
    }

    return NextResponse.json({
      member: auth.target,
      cycle: cycleSummary(cycle),
      record,
      status: submissionStatus(record),
      auditLogs,
    })
  } catch (err) {
    console.error("[GET /api/admin/submissions/:userId]", err)
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/submissions/[userId] — admin corrects a submitted entry
 * (goals, ratings, and/or assigned counts) before the evaluation is finalized.
 * Every change is audit-logged (who, what, when). Locked once the cycle closes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const auth = await authorize(session, params.userId)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const cycle = await getCurrentCycle()
    if (!cycle) return NextResponse.json({ error: "No active cycle found" }, { status: 404 })
    if (!isCycleOpen(cycle)) {
      return NextResponse.json(
        { error: "The evaluation is finalized. Entries are locked and can no longer be edited." },
        { status: 403 }
      )
    }

    const record = await PerformanceRecord.findOne({
      user: params.userId,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })
    if (!record) {
      return NextResponse.json(
        { error: "This member has no entry for the current cycle yet." },
        { status: 404 }
      )
    }

    const body = await req.json()

    // Whitelist + per-field validation (partial updates allowed).
    const updates: Record<string, any> = {}
    for (const field of MEMBER_FIELDS) {
      if (!(field in body)) continue
      if (field === "personalGoal" || field === "professionalGoal") {
        const value = typeof body[field] === "string" ? body[field].trim() : ""
        if (!value) return NextResponse.json({ error: `${field} cannot be empty.` }, { status: 400 })
        if (value.length > 2000)
          return NextResponse.json({ error: `${field} must be 2000 characters or fewer.` }, { status: 400 })
        updates[field] = value
      } else {
        const num = Number(body[field])
        if (!Number.isFinite(num) || num < 0 || num > 100)
          return NextResponse.json({ error: `${field} must be between 0 and 100.` }, { status: 400 })
        updates[field] = num
      }
    }
    for (const field of ASSIGNMENT_FIELDS) {
      if (field in body) updates[field] = Number(body[field])
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No editable fields provided." }, { status: 400 })
    }

    const mergedCounts = {
      deliverablesAssigned: updates.deliverablesAssigned ?? record.deliverablesAssigned,
      deliverablesAnswered: updates.deliverablesAnswered ?? record.deliverablesAnswered,
      meetingsTotal: updates.meetingsTotal ?? record.meetingsTotal,
      meetingsAttended: updates.meetingsAttended ?? record.meetingsAttended,
    }
    const countsError = validateAssignedCounts(mergedCounts)
    if (countsError) return NextResponse.json({ error: countsError }, { status: 400 })

    const changes = diffFields(record, updates, [...MEMBER_FIELDS, ...ASSIGNMENT_FIELDS])
    Object.assign(record, updates)
    await record.save()

    if (changes.length > 0) {
      await writeAuditLog({
        record,
        actor: {
          id: session!.user.id,
          name: session!.user.name,
          role: session!.user.role,
        },
        action: "edit",
        changes,
      })
    }

    return NextResponse.json({ record, status: submissionStatus(record) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}
