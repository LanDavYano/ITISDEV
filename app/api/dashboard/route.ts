import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000

function isCycleOpen(cycle: any, now: Date): boolean {
  if (!cycle) return false
  if (cycle.isArchived || cycle.isManuallyClosed) return false
  return now <= new Date(cycle.submissionDeadline)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User, PerformanceRecord, EvaluationCycle } = require("@/database")
    await connectDB()

    const now = new Date()

    // 1. Full user profile from DB (includes profilePicture not stored in JWT)
    const me = await User.findById(session.user.id)
      .populate("role", "title level")
      .populate("department", "name")
      .populate("subDepartment", "name")
      .lean() as any

    // 2. Current cycle (auto-archive stale ones first)
    await EvaluationCycle.updateMany(
      {
        isArchived: false,
        isManuallyClosed: false,
        submissionDeadline: { $lt: new Date(now.getTime() - MS_3_DAYS) },
      },
      { $set: { isArchived: true, archivedAt: now } }
    )
    const cycle = await EvaluationCycle.findOne()
      .sort({ periodYear: -1, submissionDeadline: -1 })
      .lean() as any

    // 3. My performance record for current cycle
    let myRecord = null
    if (cycle) {
      myRecord = await PerformanceRecord.findOne({
        user: session.user.id,
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      }).lean() as any
    }

    // 4. Sub-department peers with submission status
    let subDeptMembers: any[] = []
    const subDeptId = me?.subDepartment?._id ?? me?.subDepartment
    if (subDeptId) {
      const peers = await User.find({ subDepartment: subDeptId })
        .populate("role", "title level")
        .lean() as any[]

      let recordsByUser: Record<string, any> = {}
      if (cycle) {
        const records = await PerformanceRecord.find({
          user: { $in: peers.map((p: any) => p._id) },
          periodMonth: cycle.periodMonth,
          periodYear: cycle.periodYear,
        }).lean() as any[]
        recordsByUser = Object.fromEntries(
          records.map((r: any) => [r.user.toString(), r])
        )
      }

      subDeptMembers = peers
        .filter((p: any) => (p.role?.level ?? 1) < 3) // exclude dept leaders
        .map((p: any) => ({
          _id: p._id.toString(),
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role?.title ?? "Member",
          roleLevel: p.role?.level ?? 1,
          hasSubmitted: !!(recordsByUser[p._id.toString()]?.submittedAt),
        }))
        .sort((a: any, b: any) => a.lastName.localeCompare(b.lastName))
    }

    return NextResponse.json({
      user: {
        id: me?._id?.toString() ?? session.user.id,
        firstName: me?.firstName ?? session.user.firstName,
        lastName: me?.lastName ?? session.user.lastName,
        email: me?.email ?? session.user.email,
        profilePicture: me?.profilePicture ?? "/images/default-avatar.png",
        role: me?.role?.title ?? session.user.role ?? "Member",
        roleLevel: me?.role?.level ?? session.user.roleLevel ?? 1,
        department: me?.department?.name ?? session.user.department ?? "",
        subDepartment: me?.subDepartment?.name ?? session.user.subDepartment ?? "",
      },
      cycle: cycle
        ? {
            _id: cycle._id.toString(),
            periodMonth: cycle.periodMonth,
            periodYear: cycle.periodYear,
            submissionDeadline: cycle.submissionDeadline,
            isOpen: isCycleOpen(cycle, now),
          }
        : null,
      myRecord: myRecord
        ? {
            submittedAt: myRecord.submittedAt ?? null,
            deliverablesAssigned: myRecord.deliverablesAssigned ?? 0,
            deliverablesAnswered: myRecord.deliverablesAnswered ?? 0,
            meetingsTotal: myRecord.meetingsTotal ?? 0,
            meetingsAttended: myRecord.meetingsAttended ?? 0,
          }
        : null,
      subDeptMembers,
    })
  } catch (err) {
    console.error("[GET /api/dashboard]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
