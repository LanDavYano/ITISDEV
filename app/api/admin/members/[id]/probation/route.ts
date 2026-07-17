import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST /api/admin/members/[id]/probation
 *
 * Manually set or clear probation for a member.
 *
 * Body: { action: "set" | "clear", reason?: string }
 *
 * Access: roleLevel >= 2 (team leaders and admins)
 * - roleLevel 2 can only act on members in their own sub-department
 * - roleLevel 3 can act on anyone
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 2)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { action, reason } = body

    if (!["set", "clear"].includes(action))
      return NextResponse.json({ error: "action must be 'set' or 'clear'" }, { status: 400 })

    if (action === "set" && (!reason || typeof reason !== "string" || !reason.trim()))
      return NextResponse.json({ error: "A reason is required when setting probation" }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User, AuditLog } = require("@/database")
    await connectDB()

    const target = await User.findById(params.id)
      .populate("role", "title level")
      .populate("department", "name")
      .populate("subDepartment", "name")

    if (!target)
      return NextResponse.json({ error: "Member not found" }, { status: 404 })

    // Team leaders (level 2) can only act on members in their own sub-department
    if (session.user.roleLevel === 2) {
      const me = await User.findById(session.user.id).select("subDepartment").lean() as any
      if (
        !me?.subDepartment ||
        !target.subDepartment ||
        me.subDepartment.toString() !== target.subDepartment._id?.toString()
      ) {
        return NextResponse.json({ error: "Forbidden: member is not in your sub-department" }, { status: 403 })
      }
    }

    const prevProbationary = target.isProbationary

    if (action === "set") {
      target.isProbationary = true
      target.probationReason = reason.trim()
      target.probationStartedAt = new Date()
      target.probationStartedBy = session.user.id
    } else {
      target.isProbationary = false
      target.probationReason = null
      target.probationStartedAt = null
      target.probationStartedBy = null
    }

    await target.save()

    // Write audit log entry
    await AuditLog.create({
      record: null,
      targetUser: target._id,
      periodMonth: null,
      periodYear: null,
      actor: session.user.id,
      actorName: `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() || "Unknown",
      actorRole: session.user.role ?? null,
      action: action === "set" ? "probation_set" : "probation_cleared",
      changes: [
        {
          field: "isProbationary",
          from: prevProbationary,
          to: target.isProbationary,
        },
        ...(action === "set" ? [{ field: "probationReason", from: null, to: reason.trim() }] : []),
      ],
      note: action === "set" ? `Manual probation: ${reason.trim()}` : "Probation cleared",
    })

    return NextResponse.json({
      message: action === "set" ? "Member placed on probation" : "Probation cleared",
      member: {
        _id: target._id.toString(),
        isProbationary: target.isProbationary,
        probationReason: target.probationReason,
        probationStartedAt: target.probationStartedAt,
      },
    })
  } catch (err) {
    console.error("[POST /api/admin/members/[id]/probation]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
