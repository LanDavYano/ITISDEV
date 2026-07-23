import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST /api/admin/probation/check
 *
 * Admin-only: scan all members and automatically flag any member who has
 * failed to meet KPIs in two consecutive cycles.
 *
 * KPI failure definition (per cycle):
 *   - Did not submit their rating (submittedAt === null), OR
 *   - Deliverables completion rate < 70% (when counts have been assigned), OR
 *   - Meeting attendance rate < 70% (when counts have been assigned)
 *
 * "Two consecutive cycles" = the two most-recent closed/archived cycles
 * (sorted by year then month) both resulted in KPI failure for that member.
 *
 * Returns: { checked: number, flagged: number, members: Array<{id, name, reason}> }
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 3)
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User, PerformanceRecord, EvaluationCycle, AuditLog } = require("@/database")
    await connectDB()

    // Month sort order helper
    const MONTH_ORDER: Record<string, number> = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12,
    }

    // Fetch the last 2 closed/archived cycles (sorted newest → oldest)
    const allCycles = await EvaluationCycle.find({
      $or: [{ isArchived: true }, { isManuallyClosed: true }],
    }).lean() as any[]

    allCycles.sort((a, b) => {
      if (b.periodYear !== a.periodYear) return b.periodYear - a.periodYear
      return (MONTH_ORDER[b.periodMonth] ?? 0) - (MONTH_ORDER[a.periodMonth] ?? 0)
    })

    const recentCycles = allCycles.slice(0, 2)

    if (recentCycles.length < 2) {
      return NextResponse.json({
        message: "Need at least 2 closed cycles to run probation check.",
        checked: 0,
        flagged: 0,
        members: [],
      })
    }

    // Fetch all submitting members (role levels 1–2)
    const members = await User.find()
      .populate("role", "title level")
      .lean() as any[]

    const submitters = members.filter((u: any) => (u.role?.level ?? 1) < 3)

    // Fetch performance records for those two cycles
    const cycleFilters = recentCycles.map((c: any) => ({
      periodMonth: c.periodMonth,
      periodYear: c.periodYear,
    }))

    const records = await PerformanceRecord.find({
      $or: cycleFilters,
    }).lean() as any[]

    // Index records by "userId|month|year"
    const recordIndex: Record<string, any> = {}
    for (const r of records) {
      recordIndex[`${r.user.toString()}|${r.periodMonth}|${r.periodYear}`] = r
    }

    function kpiFailed(record: any): boolean {
      if (!record || !record.submittedAt) return true // no submission = fail
      const delivPct =
        record.deliverablesAssigned > 0
          ? record.deliverablesAnswered / record.deliverablesAssigned
          : null
      const meetPct =
        record.meetingsTotal > 0
          ? record.meetingsAttended / record.meetingsTotal
          : null
      if (delivPct !== null && delivPct < 0.7) return true
      if (meetPct !== null && meetPct < 0.7) return true
      return false
    }

    const nowFlagged: Array<{ id: string; name: string; reason: string }> = []
    const actorName = `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() || "Admin"

    for (const member of submitters) {
      const uid = member._id.toString()

      // Check failure across both recent cycles
      const cycle1 = recentCycles[0]
      const cycle2 = recentCycles[1]

      const r1 = recordIndex[`${uid}|${cycle1.periodMonth}|${cycle1.periodYear}`] ?? null
      const r2 = recordIndex[`${uid}|${cycle2.periodMonth}|${cycle2.periodYear}`] ?? null

      const failed1 = kpiFailed(r1)
      const failed2 = kpiFailed(r2)

      if (failed1 && failed2 && !member.isProbationary) {
        // Flag this member
        const reason = `Automatic: KPI targets not met in ${cycle2.periodMonth} ${cycle2.periodYear} and ${cycle1.periodMonth} ${cycle1.periodYear}`

        await User.findByIdAndUpdate(uid, {
          $set: {
            isProbationary: true,
            probationReason: reason,
            probationStartedAt: new Date(),
            probationStartedBy: session.user.id,
          },
        })

        await AuditLog.create({
          record: null,
          targetUser: member._id,
          periodMonth: null,
          periodYear: null,
          actor: session.user.id,
          actorName,
          actorRole: session.user.role ?? null,
          action: "probation_set",
          changes: [{ field: "isProbationary", from: false, to: true }],
          note: reason,
        })

        nowFlagged.push({
          id: uid,
          name: `${member.firstName} ${member.lastName}`,
          reason,
        })
      }
    }

    return NextResponse.json({
      message: `Probation check complete. ${nowFlagged.length} member(s) newly flagged.`,
      checked: submitters.length,
      flagged: nowFlagged.length,
      members: nowFlagged,
    })
  } catch (err) {
    console.error("[POST /api/admin/probation/check]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
