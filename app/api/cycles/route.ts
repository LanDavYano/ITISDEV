import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

    const cycles = await EvaluationCycle.find()
      .sort({ periodYear: -1, submissionDeadline: -1 })
      .populate("createdBy", "firstName lastName email")
      .lean()

    return NextResponse.json(
      cycles.map((c: any) => ({
        ...c,
        isOpen: isCycleOpen(c),
        isDeadlineClosed: isDeadlineClosed(c),
        canExtend: canExtendCycle(c),
        isPastPeriod: isPastPeriod(c),
      }))
    )
  } catch {
    return NextResponse.json({ error: "Failed to fetch cycles" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { periodMonth, periodYear, submissionDeadline } = await req.json()

    // APMP-61: Deadline must be in the future
    if (new Date(submissionDeadline) <= new Date()) {
      return NextResponse.json({ error: "Deadline must be a future date" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycle = await EvaluationCycle.create({
      periodMonth,
      periodYear,
      submissionDeadline: new Date(submissionDeadline),
      isManuallyClosed: false,
      closedAt: null,
      closedBy: null,
      isArchived: false,
      archivedAt: null,
      createdBy: session.user.id,
    })

    return NextResponse.json(
      {
        ...cycle.toObject(),
        isOpen: isCycleOpen(cycle),
        isDeadlineClosed: false,
        canExtend: false,
        isPastPeriod: isPastPeriod(cycle),
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "A cycle for this period already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create cycle" }, { status: 500 })
  }
}
