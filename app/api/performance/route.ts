import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  isCycleOpen,
  getCurrentCycle,
  validateMemberSubmission,
} from "@/lib/performance"

/**
 * POST /api/performance — submit the member's own rating submission for the
 * current, open cycle.
 *
 * - Members can only submit for themselves (user is always taken from the
 *   session, never from the body) and only for the current cycle.
 * - Requires: personalGoal, professionalGoal (strings) and
 *   personalRating, professionalRating (0–100).
 * - Deliverable/meeting counts are NOT accepted here — those are assigned by
 *   the team leader via /api/team/records.
 * - If the team leader already created the record (counts assigned before the
 *   member submitted), the member's fields are filled into that record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const cycle = await getCurrentCycle()
    if (!cycle) {
      return NextResponse.json(
        { error: "There is no active evaluation cycle yet. Please check back later." },
        { status: 404 }
      )
    }
    if (!isCycleOpen(cycle)) {
      return NextResponse.json(
        { error: "This cycle is closed. New submissions are not allowed." },
        { status: 403 }
      )
    }

    const body = await req.json()

    // Validate the member-submitted fields.
    const validationError = validateMemberSubmission(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const memberData = {
      personalGoal: String(body.personalGoal).trim(),
      professionalGoal: String(body.professionalGoal).trim(),
      personalRating: Number(body.personalRating),
      professionalRating: Number(body.professionalRating),
    }

    // A record may already exist if the team leader assigned counts first.
    const existing = await PerformanceRecord.findOne({
      user: session.user.id,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })

    if (existing) {
      if (existing.submittedAt) {
        return NextResponse.json(
          { error: "You already have a submission for this period. Edit it instead." },
          { status: 409 }
        )
      }
      Object.assign(existing, memberData, { submittedAt: new Date() })
      await existing.save()
      return NextResponse.json(existing, { status: 200 })
    }

    const record = await PerformanceRecord.create({
      user: session.user.id, // self-only: always from the session
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
      ...memberData,
      submittedAt: new Date(),
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "You already have a submission for this period." },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: error.message || "Failed to submit" },
      { status: 500 }
    )
  }
}
