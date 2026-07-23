import { NextResponse } from "next/server"

const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTH_TO_INDEX = Object.fromEntries(MONTHS.map((m, i) => [m, i])) as Record<string, number>

function isPastPeriod(cycle: any) {
  const now = new Date()
  const monthIndex = MONTH_TO_INDEX[cycle.periodMonth]
  const nowMonth = now.getMonth()
  const nowYear = now.getFullYear()
  return cycle.periodYear < nowYear || (cycle.periodYear === nowYear && monthIndex < nowMonth)
}

function isCycleOpen(cycle: any) {
  if (cycle.isArchived) return false
  if (cycle.isManuallyClosed) return false
  return new Date() <= new Date(cycle.submissionDeadline)
}

function isDeadlineClosed(cycle: any) {
  if (cycle.isArchived) return false
  if (cycle.isManuallyClosed) return false
  return new Date() > new Date(cycle.submissionDeadline)
}

function canExtendCycle(cycle: any) {
  if (!isDeadlineClosed(cycle)) return false
  const now = new Date().getTime()
  const deadline = new Date(cycle.submissionDeadline).getTime()
  return now <= deadline + MS_3_DAYS
}

// Returns the most recently created open cycle, or the most recently created
// cycle overall if none are open — see getCurrentCycle() in lib/performance.ts
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()

    const now = new Date()
    const archiveCutoff = new Date(now.getTime() - MS_3_DAYS)
    await EvaluationCycle.updateMany(
      {
        isArchived: false,
        isManuallyClosed: false,
        submissionDeadline: { $lt: archiveCutoff },
      },
      {
        $set: {
          isArchived: true,
          archivedAt: now,
        },
      }
    )

    // Prefer the most recently created cycle that's still open; a newer
    // cycle that's been closed/archived (e.g. a test cycle) must never
    // shadow an older cycle that's still open for submission. Only fall
    // back to "most recent regardless of state" when none are open, so
    // admins retain the 3-day window to extend a cycle that just closed.
    const openCycle = await EvaluationCycle.findOne({
      isArchived: false,
      isManuallyClosed: false,
      submissionDeadline: { $gte: now },
    })
      .sort({ createdAt: -1, updatedAt: -1 })
      .lean()

    const cycle =
      openCycle ??
      (await EvaluationCycle.findOne().sort({ createdAt: -1, updatedAt: -1 }).lean())

    if (!cycle) return NextResponse.json(null)

    return NextResponse.json({
      ...cycle,
      isOpen: isCycleOpen(cycle),
      isDeadlineClosed: isDeadlineClosed(cycle),
      canExtend: canExtendCycle(cycle),
      isPastPeriod: isPastPeriod(cycle),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch current cycle" }, { status: 500 })
  }
}
