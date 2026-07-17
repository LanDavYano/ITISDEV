import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/performance/history?limit=12&year=2026
 *
 * Returns the signed-in member's own performance records sorted by year/month
 * descending. Used by the member dashboard to power the historical chart and
 * the past-cycle breakdown table.
 *
 * Query params:
 *   limit  — max records to return (default 12, max 36)
 *   year   — filter to a specific year (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const { searchParams } = new URL(req.url)
    const rawLimit = parseInt(searchParams.get("limit") ?? "12", 10)
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 12 : rawLimit), 36)
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null

    const query: Record<string, any> = { user: session.user.id }
    if (year && !isNaN(year)) query.periodYear = year

    const MONTH_ORDER: Record<string, number> = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12,
    }

    const records = await PerformanceRecord.find(query)
      .sort({ periodYear: -1 })
      .limit(limit)
      .lean() as any[]

    // Sort within same year by month descending
    records.sort((a, b) => {
      if (b.periodYear !== a.periodYear) return b.periodYear - a.periodYear
      return (MONTH_ORDER[b.periodMonth] ?? 0) - (MONTH_ORDER[a.periodMonth] ?? 0)
    })

    const history = records.map((r) => {
      const delivPct =
        r.deliverablesAssigned > 0
          ? Math.round((r.deliverablesAnswered / r.deliverablesAssigned) * 100)
          : null
      const meetPct =
        r.meetingsTotal > 0
          ? Math.round((r.meetingsAttended / r.meetingsTotal) * 100)
          : null

      // A cycle is considered "passed" if submitted AND both rates >= 70%
      // (or if counts haven't been assigned yet, we check only submission)
      const submitted = !!r.submittedAt
      const passedKpi =
        submitted &&
        (delivPct === null || delivPct >= 70) &&
        (meetPct === null || meetPct >= 70)

      return {
        _id: r._id.toString(),
        periodMonth: r.periodMonth,
        periodYear: r.periodYear,
        submittedAt: r.submittedAt ?? null,
        submitted,
        passedKpi,
        deliverablesAssigned: r.deliverablesAssigned,
        deliverablesAnswered: r.deliverablesAnswered,
        deliverablesPct: delivPct,
        meetingsTotal: r.meetingsTotal,
        meetingsAttended: r.meetingsAttended,
        meetingsPct: meetPct,
        personalRating: r.personalRating ?? null,
        professionalRating: r.professionalRating ?? null,
        isFlagged: r.isFlagged ?? false,
      }
    })

    // Derive available years for year-picker UI
    const allRecords = await PerformanceRecord.find({ user: session.user.id })
      .select("periodYear")
      .lean() as any[]
    const years = [...new Set(allRecords.map((r: any) => r.periodYear))].sort((a, b) => b - a)

    return NextResponse.json({ history, years })
  } catch (err) {
    console.error("[GET /api/performance/history]", err)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
