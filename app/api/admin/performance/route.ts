import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateFinalScore, type PerfInputs } from "@/lib/scoring"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, EvaluationCycle } = require("@/database")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PerformanceRecord = require("@/database/PerformanceRecord")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KpiConfig = require("@/database/KpiConfig")

    await connectDB()

    const cycle = await EvaluationCycle.findOne().sort({ createdAt: -1, updatedAt: -1 })
    const periodMonth = cycle?.periodMonth ?? new Date().toLocaleString("en-US", { month: "long" })
    const periodYear = cycle?.periodYear ?? new Date().getFullYear()

    const configDoc = await KpiConfig.findOne({ periodMonth, periodYear }).lean()
    const kpiConfigs = configDoc?.kpis?.length ? configDoc.kpis : KpiConfig.DEFAULT_KPI_CONFIG

    // Only this period's records — a user can have records from prior
    // periods too, and those shouldn't be mixed into the current score.
    const records = await PerformanceRecord.find({ periodMonth, periodYear }).lean()

    const map: Record<string, any> = {}

    for (const r of records as any[]) {
      // "manual" KPIs (e.g. "VP Rating") are still scored per-member on the
      // record itself — everything else (weight, source, cutoff, policy)
      // comes from the shared KpiConfig above.
      const manualScores: Record<string, number> = {}
      for (const k of r.kpis ?? []) {
        if (k?.name) manualScores[k.name] = k.score ?? 0
      }

      const inputs: PerfInputs = {
        personalRating: r.personalRating ?? null,
        professionalRating: r.professionalRating ?? null,
        meetingsTotal: r.meetingsTotal ?? 0,
        meetingsAttended: r.meetingsAttended ?? 0,
        deliverablesAssigned: r.deliverablesAssigned ?? 0,
        deliverablesAnswered: r.deliverablesAnswered ?? 0,
        submittedAt: r.submittedAt ?? null,
        cycleDeadline: cycle?.submissionDeadline ?? null,
        isFlagged: r.isFlagged ?? false,
        manualScores,
      }

      const result = calculateFinalScore(kpiConfigs, inputs)

      map[r.user.toString()] = {
        // Keep the old fields so any code still reading them doesn't break
        personalRating: r.personalRating ?? null,
        professionalRating: r.professionalRating ?? null,
        deliverablesAssigned: r.deliverablesAssigned ?? 0,
        deliverablesAnswered: r.deliverablesAnswered ?? 0,
        meetingsTotal: inputs.meetingsTotal,
        meetingsAttended: inputs.meetingsAttended,
        kpis: r.kpis || [],

        // The computed, auditable result
        finalScore: result.finalScore,
        eligible: result.eligible,
        submissionStatus: result.submissionStatus,
        breakdown: result.breakdown,
        flags: result.flags,
      }
    }

    return NextResponse.json(map)
  } catch (err) {
    console.error("Failed to fetch performance data:", err)
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}