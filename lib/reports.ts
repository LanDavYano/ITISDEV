/**
 * Performance Report engine — scoped roll-ups of PerformanceRecord data by
 * member, sub-department, or department, across a chosen range of
 * evaluation cycles. Reuses the same scoring pipeline as the admin
 * dashboard/stats route (lib/scoring.ts) so a report's numbers always
 * agree with what admins see elsewhere.
 *
 * "Attendance" here means meetingsAttended/meetingsTotal off
 * PerformanceRecord — this app has no separate per-date attendance log,
 * so that's the only attendance data that exists to report on.
 *
 * Server only — imports the database layer; do not use in client components.
 */

import { calculateFinalScore, type PerfInputs } from "@/lib/scoring"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTH_TO_INDEX: Record<string, number> = Object.fromEntries(MONTHS.map((m, i) => [m, i]))

function cycleIndex(cycle: { periodMonth: string; periodYear: number }): number {
  return cycle.periodYear * 12 + (MONTH_TO_INDEX[cycle.periodMonth] ?? 0)
}

export type ReportScope = "member" | "subDepartment" | "department"

/** Thrown for any client-fixable problem (bad/missing scope, no period chosen, scope not found). */
export class ReportError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export interface BuildReportParams {
  scope: string | null
  scopeId: string | null
  startCycleId: string | null
  endCycleId: string | null
  generatedBy: { id: string; name?: string | null }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100 * 100) / 100
}

export async function buildPerformanceReport(params: BuildReportParams) {
  const { scope, scopeId, startCycleId, endCycleId, generatedBy } = params

  if (scope !== "member" && scope !== "subDepartment" && scope !== "department") {
    throw new ReportError("Choose a scope: member, sub-department, or department.")
  }
  if (!scopeId) {
    throw new ReportError("Choose who this report covers.")
  }
  if (!startCycleId || !endCycleId) {
    throw new ReportError("An evaluation period must be selected before generating a report.")
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { connectDB, User, PerformanceRecord, EvaluationCycle, Department, SubDepartment } = require("@/database")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const KpiConfig = require("@/database/KpiConfig")
  await connectDB()

  const [startCycleDoc, endCycleDoc] = await Promise.all([
    EvaluationCycle.findById(startCycleId).lean(),
    EvaluationCycle.findById(endCycleId).lean(),
  ])
  if (!startCycleDoc || !endCycleDoc) {
    throw new ReportError("The selected evaluation period could not be found.")
  }

  let lo = cycleIndex(startCycleDoc as any)
  let hi = cycleIndex(endCycleDoc as any)
  if (lo > hi) [lo, hi] = [hi, lo]

  const allCycles = await EvaluationCycle.find().lean()
  const inRange = (allCycles as any[])
    .filter((c) => cycleIndex(c) >= lo && cycleIndex(c) <= hi)
    .sort((a, b) => cycleIndex(a) - cycleIndex(b))

  // A period can have more than one EvaluationCycle doc (e.g. archived, then
  // re-created — the model's unique index only applies while isArchived is
  // false). PerformanceRecord and KpiConfig are both keyed by periodMonth +
  // periodYear alone, so counting the same period twice here would double
  // every member's numbers. Keep one cycle per distinct period — prefer the
  // non-archived one (the "live" cycle) when both exist.
  const byPeriod = new Map<string, any>()
  for (const c of inRange) {
    const key = `${c.periodMonth}-${c.periodYear}`
    const existing = byPeriod.get(key)
    if (!existing || (existing.isArchived && !c.isArchived)) byPeriod.set(key, c)
  }
  const cycles = [...byPeriod.values()].sort((a, b) => cycleIndex(a) - cycleIndex(b))

  if (cycles.length === 0) {
    throw new ReportError("No evaluation cycles fall within the selected period.")
  }

  // ── Resolve scope → user filter + display label ──────────────────────────
  let userFilter: Record<string, any> = {}
  let scopeLabel = ""

  if (scope === "member") {
    const doc = await User.findById(scopeId)
      .populate("department", "name")
      .populate("subDepartment", "name")
      .lean()
    if (!doc) throw new ReportError("Member not found.", 404)
    userFilter = { _id: scopeId }
    scopeLabel = `${(doc as any).firstName} ${(doc as any).lastName}`
  } else if (scope === "subDepartment") {
    const doc = await SubDepartment.findById(scopeId).populate("department", "name").lean()
    if (!doc) throw new ReportError("Sub-department not found.", 404)
    userFilter = { subDepartment: scopeId }
    scopeLabel = `${(doc as any).name} (${(doc as any).department?.name ?? "—"})`
  } else {
    const doc = await Department.findById(scopeId).lean()
    if (!doc) throw new ReportError("Department not found.", 404)
    userFilter = { department: scopeId }
    scopeLabel = (doc as any).name
  }

  let users = await User.find(userFilter)
    .populate("role", "title level")
    .populate("department", "name")
    .populate("subDepartment", "name")
    .sort({ lastName: 1, firstName: 1 })
    .lean()

  // Sub-department/department roll-ups cover members + team leads only —
  // department leaders (role level 3) are admin reviewers who don't submit
  // PerformanceRecords (see /api/team/records), so they'd otherwise show up
  // as a phantom "not submitted" row skewing the aggregate. A member-scope
  // report on a specific person is left as-is since that's an explicit pick.
  if (scope !== "member") {
    users = (users as any[]).filter((u) => (u.role?.level ?? 1) < 3)
  }

  // ── KPI config per distinct period in range, same fallback /api/admin/stats uses ──
  const kpiConfigByPeriod: Record<string, any[]> = {}
  for (const cycle of cycles) {
    const key = `${cycle.periodMonth}-${cycle.periodYear}`
    const configDoc = await KpiConfig.findOne({ periodMonth: cycle.periodMonth, periodYear: cycle.periodYear }).lean()
    kpiConfigByPeriod[key] = configDoc?.kpis?.length ? configDoc.kpis : KpiConfig.DEFAULT_KPI_CONFIG
  }

  const userIds = (users as any[]).map((u) => u._id)
  const records = userIds.length
    ? await PerformanceRecord.find({
        user: { $in: userIds },
        $or: cycles.map((c) => ({ periodMonth: c.periodMonth, periodYear: c.periodYear })),
      }).lean()
    : []
  const recordByKey = new Map<string, any>(
    (records as any[]).map((r) => [`${r.user.toString()}-${r.periodMonth}-${r.periodYear}`, r])
  )

  const members = (users as any[]).map((u) => {
    const finalScores: number[] = []
    const personalRatings: number[] = []
    const professionalRatings: number[] = []
    let cyclesSubmitted = 0
    let attended = 0
    let total = 0
    let answered = 0
    let assigned = 0

    const perCycle = cycles.map((cycle) => {
      const record = recordByKey.get(`${u._id.toString()}-${cycle.periodMonth}-${cycle.periodYear}`) ?? null
      const manualScores: Record<string, number> = {}
      for (const k of record?.kpis ?? []) {
        if (k?.name) manualScores[k.name] = k.score ?? 0
      }
      const inputs: PerfInputs = {
        personalRating: record?.personalRating ?? null,
        professionalRating: record?.professionalRating ?? null,
        meetingsTotal: record?.meetingsTotal ?? 0,
        meetingsAttended: record?.meetingsAttended ?? 0,
        deliverablesAssigned: record?.deliverablesAssigned ?? 0,
        deliverablesAnswered: record?.deliverablesAnswered ?? 0,
        submittedAt: record?.submittedAt ?? null,
        cycleDeadline: cycle.submissionDeadline ?? null,
        isFlagged: record?.isFlagged ?? false,
        manualScores,
      }
      const kpiConfigs = kpiConfigByPeriod[`${cycle.periodMonth}-${cycle.periodYear}`]
      const result = calculateFinalScore(kpiConfigs, inputs)

      if (record?.submittedAt) cyclesSubmitted += 1
      total += record?.meetingsTotal ?? 0
      attended += record?.meetingsAttended ?? 0
      assigned += record?.deliverablesAssigned ?? 0
      answered += record?.deliverablesAnswered ?? 0
      if (record?.personalRating != null) personalRatings.push(record.personalRating)
      if (record?.professionalRating != null) professionalRatings.push(record.professionalRating)
      if (result.finalScore !== null) finalScores.push(result.finalScore)

      return {
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
        finalScore: result.finalScore,
        submissionStatus: result.submissionStatus,
        meetingsAttended: record?.meetingsAttended ?? 0,
        meetingsTotal: record?.meetingsTotal ?? 0,
        deliverablesAnswered: record?.deliverablesAnswered ?? 0,
        deliverablesAssigned: record?.deliverablesAssigned ?? 0,
        personalRating: record?.personalRating ?? null,
        professionalRating: record?.professionalRating ?? null,
        isFlagged: record?.isFlagged ?? false,
      }
    })

    return {
      userId: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      department: u.department?.name ?? null,
      subDepartment: u.subDepartment?.name ?? null,
      role: u.role?.title ?? null,
      isProbationary: !!u.isProbationary,
      cyclesIncluded: cycles.length,
      cyclesSubmitted,
      submissionRatePct: pct(cyclesSubmitted, cycles.length),
      avgFinalScore: average(finalScores),
      personalRatingAvg: average(personalRatings),
      professionalRatingAvg: average(professionalRatings),
      attendance: { attended, total, pct: pct(attended, total) },
      deliverables: { answered, assigned, pct: pct(answered, assigned) },
      perCycle,
    }
  })

  const memberScoreAvgs = members.map((m) => m.avgFinalScore).filter((v): v is number => v !== null)
  const memberAttendancePcts = members.map((m) => m.attendance.pct).filter((v): v is number => v !== null)
  const memberDeliverablesPcts = members.map((m) => m.deliverables.pct).filter((v): v is number => v !== null)
  const totalCyclesIncluded = members.reduce((sum, m) => sum + m.cyclesIncluded, 0)
  const totalCyclesSubmitted = members.reduce((sum, m) => sum + m.cyclesSubmitted, 0)

  const periodLabel =
    cycles.length === 1
      ? `${cycles[0].periodMonth} ${cycles[0].periodYear}`
      : `${cycles[0].periodMonth} ${cycles[0].periodYear} – ${cycles[cycles.length - 1].periodMonth} ${cycles[cycles.length - 1].periodYear}`

  return {
    scope,
    scopeLabel,
    periodLabel,
    cycles: cycles.map((c) => ({ periodMonth: c.periodMonth, periodYear: c.periodYear })),
    generatedAt: new Date().toISOString(),
    generatedBy: generatedBy.name ?? "Unknown",
    summary: {
      memberCount: members.length,
      avgFinalScore: average(memberScoreAvgs),
      avgAttendancePct: average(memberAttendancePcts),
      avgDeliverablesPct: average(memberDeliverablesPcts),
      submissionRatePct: pct(totalCyclesSubmitted, totalCyclesIncluded),
    },
    members,
  }
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

/** Flatten a report into one CSV row per member (aggregated across the selected period). */
export function reportToCsv(report: Awaited<ReturnType<typeof buildPerformanceReport>>): string {
  const lines: string[] = [
    "Performance Report",
    `Scope,${csvEscape(report.scopeLabel)}`,
    `Period,${csvEscape(report.periodLabel)}`,
    `Generated At,${csvEscape(report.generatedAt)}`,
    `Generated By,${csvEscape(report.generatedBy)}`,
    "",
    [
      "First Name", "Last Name", "Email", "Department", "Sub-Department", "Role",
      "Cycles Included", "Cycles Submitted", "Submission Rate (%)", "Avg Final Score",
      "Personal Rating Avg", "Professional Rating Avg",
      "Meetings Attended", "Meetings Total", "Meeting Attendance (%)",
      "Deliverables Answered", "Deliverables Assigned", "Deliverables (%)",
      "Probationary",
    ].join(","),
  ]

  for (const m of report.members) {
    lines.push(
      [
        csvEscape(m.firstName),
        csvEscape(m.lastName),
        csvEscape(m.email),
        csvEscape(m.department ?? ""),
        csvEscape(m.subDepartment ?? ""),
        csvEscape(m.role ?? ""),
        csvEscape(m.cyclesIncluded),
        csvEscape(m.cyclesSubmitted),
        csvEscape(m.submissionRatePct ?? ""),
        csvEscape(m.avgFinalScore ?? ""),
        csvEscape(m.personalRatingAvg ?? ""),
        csvEscape(m.professionalRatingAvg ?? ""),
        csvEscape(m.attendance.attended),
        csvEscape(m.attendance.total),
        csvEscape(m.attendance.pct ?? ""),
        csvEscape(m.deliverables.answered),
        csvEscape(m.deliverables.assigned),
        csvEscape(m.deliverables.pct ?? ""),
        csvEscape(m.isProbationary ? "Yes" : "No"),
      ].join(",")
    )
  }

  return lines.join("\r\n")
}
