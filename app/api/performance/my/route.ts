import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCycle, cycleSummary } from "@/lib/performance"

/**
 * GET /api/performance/my — the signed-in member's own record for a cycle.
 *
 * Returns { cycle, record } so the submission form can render the cycle
 * banner (deadline / open state) and the member's entry in one request.
 * `record` is null when nothing has been submitted or assigned yet.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord, EvaluationCycle } = require("@/database")
    await connectDB()

    const { searchParams } = new URL(req.url)
    const cycleId = searchParams.get("cycleId")

    const cycle = cycleId
      ? await EvaluationCycle.findById(cycleId)
      : await getCurrentCycle()

    if (!cycle) {
      // No cycle exists yet — the form shows an informative empty state.
      return NextResponse.json({ cycle: null, record: null })
    }

    const record = await PerformanceRecord.findOne({
      user: session.user.id,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })

    return NextResponse.json({ cycle: cycleSummary(cycle), record })
  } catch {
    return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 })
  }
}
