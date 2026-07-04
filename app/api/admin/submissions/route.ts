import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCycle, cycleSummary, submissionStatus } from "@/lib/performance"

/**
 * GET /api/admin/submissions — review roster for the current cycle.
 *
 * Every submitting user (role levels 1–2) with their submission status:
 * "Submitted" | "Submitted with flags" | "Not submitted", plus the record
 * itself for the review UI.
 *
 * Access: roleLevel 3 sees everyone; roleLevel 2 sees their own
 * sub-department. Each row's `_id` is the member's user id (stable even when
 * nothing has been submitted), which the admin page uses for its detail link.
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

    const memberFilter: Record<string, any> = {}
    if (session.user.roleLevel === 2) {
      const me = await User.findById(session.user.id).select("subDepartment")
      if (!me?.subDepartment) {
        return NextResponse.json({ cycle: cycleSummary(cycle), submissions: [] })
      }
      memberFilter.subDepartment = me.subDepartment
    }

    const users = await User.find(memberFilter)
      .populate("role", "title level")
      .populate("department", "name officeType")
      .populate("subDepartment", "name")
      .sort({ lastName: 1, firstName: 1 })
      .lean()

    // Only levels 1–2 are expected to submit (level 3 = admin reviewers).
    const submitters = users.filter((u: any) => (u.role?.level ?? 1) < 3)

    let recordsByUser: Record<string, any> = {}
    if (cycle) {
      const records = await PerformanceRecord.find({
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      }).lean()
      recordsByUser = Object.fromEntries(records.map((r: any) => [r.user.toString(), r]))
    }

    const submissions = submitters.map((u: any) => {
      const record = recordsByUser[u._id.toString()] ?? null
      return {
        _id: u._id, // member id — stable key/link even when not submitted
        member: u,
        record,
        status: submissionStatus(record),
        cycle: cycle ? `${cycle.periodMonth} ${cycle.periodYear}` : "—",
      }
    })

    return NextResponse.json({ cycle: cycleSummary(cycle), submissions })
  } catch (err) {
    console.error("[GET /api/admin/submissions]", err)
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}
