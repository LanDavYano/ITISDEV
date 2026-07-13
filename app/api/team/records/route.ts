import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCycle, cycleSummary } from "@/lib/performance"

/**
 * GET /api/team/records — a team leader's view of their team for the current
 * cycle: every member of their sub-department with that member's performance
 * record (or null if none exists yet).
 *
 * Access: roleLevel 2+ with sub-department scoping to the viewer's own team.
 */
export async function GET() {
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

    // Scope department leaders to the sub-department leaders under their department,
    // and sub-department leaders to their own sub-department.
    const me = await User.findById(session.user.id).select("department subDepartment")
    const roleLevel = Number(session.user.roleLevel ?? 1)
    const memberFilter: Record<string, any> = {}

    if (roleLevel >= 3) {
      if (me?.department) {
        memberFilter.department = me.department
        memberFilter.subDepartment = { $ne: null }
      } else {
        return NextResponse.json({ cycle: cycleSummary(cycle), team: [] })
      }
    } else if (roleLevel === 2) {
      if (me?.subDepartment) {
        memberFilter.subDepartment = me.subDepartment
      } else {
        return NextResponse.json({ cycle: cycleSummary(cycle), team: [] })
      }
    } else {
      return NextResponse.json({ cycle: cycleSummary(cycle), team: [] })
    }

    const members = await User.find(memberFilter)
      .populate("role", "title level")
      .populate("department", "name")
      .populate("subDepartment", "name")
      .sort({ lastName: 1, firstName: 1 })
      .lean()

    // Only levels 1–2 submit performance records (level 3 = admin reviewers).
    const team = members.filter((m: any) => {
      if (roleLevel >= 3) {
        return (m.role?.level ?? 1) === 2
      }
      return (m.role?.level ?? 1) < 3
    })

    let recordsByUser: Record<string, any> = {}
    if (cycle) {
      const records = await PerformanceRecord.find({
        user: { $in: team.map((m: any) => m._id) },
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      }).lean()
      recordsByUser = Object.fromEntries(records.map((r: any) => [r.user.toString(), r]))
    }

    return NextResponse.json({
      cycle: cycleSummary(cycle),
      team: team.map((m: any) => ({
        member: {
          _id: m._id,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          role: m.role,
          department: m.department,
          subDepartment: m.subDepartment,
        },
        record: recordsByUser[m._id.toString()] ?? null,
      })),
    })
  } catch (err) {
    console.error("[GET /api/team/records]", err)
    return NextResponse.json({ error: "Failed to fetch team records" }, { status: 500 })
  }
}
