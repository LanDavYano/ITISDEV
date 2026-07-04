import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isCycleOpen,
  getCurrentCycle,
  validateMemberSubmission,
} from "@/lib/performance"

/**
 * PATCH /api/performance/[id] — a member edits their OWN rating submission
 * while the submission window is still open.
 *
 * Only the member-submitted fields are accepted (goals + ratings); the
 * team-leader-assigned counts and admin flags cannot be modified here.
 * Locked once the cycle is closed / finalized.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const cycle = await getCurrentCycle()
    if (!cycle) return NextResponse.json({ error: "No active cycle found" }, { status: 404 })

    // If the cycle is manually closed or the deadline has passed, editing is locked.
    if (!isCycleOpen(cycle)) {
      return NextResponse.json(
        { error: "This cycle is closed. Editing is locked." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validationError = validateMemberSubmission(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Whitelist: members may only change their own goals and ratings.
    const updates = {
      personalGoal: String(body.personalGoal).trim(),
      professionalGoal: String(body.professionalGoal).trim(),
      personalRating: Number(body.personalRating),
      professionalRating: Number(body.professionalRating),
    }

    // Scope to the member's own record within the current cycle only.
    const record = await PerformanceRecord.findOneAndUpdate(
      {
        _id: params.id,
        user: session.user.id,
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
      },
      updates,
      { new: true, runValidators: true }
    )

    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    return NextResponse.json(record)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 })
  }
}
