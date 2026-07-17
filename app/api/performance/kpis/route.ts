import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { validateKpiConfig, type KpiConfig as KpiConfigShape } from "@/lib/scoring"

const VALID_SOURCES = ["rating", "attendance", "deliverables", "timeliness", "manual"]
const VALID_POLICIES = ["exclude", "flag", "default"]

function normalizeKpis(input: unknown): KpiConfigShape[] | null {
  if (!Array.isArray(input)) return null

  const normalized: KpiConfigShape[] = input.map((entry: any) => ({
    name: typeof entry?.name === "string" ? entry.name.trim() : "",
    weight: Number(entry?.weight),
    source: entry?.source,
    required: Boolean(entry?.required),
    cutoff: entry?.cutoff != null ? Number(entry.cutoff) : undefined,
    missingPolicy: entry?.missingPolicy,
    defaultValue: entry?.defaultValue != null ? Number(entry.defaultValue) : undefined,
  }))

  if (normalized.some((k) => !k.name)) return null
  if (normalized.some((k) => !VALID_SOURCES.includes(k.source))) return null
  if (normalized.some((k) => !VALID_POLICIES.includes(k.missingPolicy))) return null

  const errors = validateKpiConfig(normalized)
  if (errors.length > 0) return null

  return normalized
}

async function getCurrentCycle() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EvaluationCycle } = require("@/database")
  return EvaluationCycle.findOne().sort({ createdAt: -1, updatedAt: -1 })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KpiConfig = require("@/database/KpiConfig")
    await connectDB()

    const cycle = await getCurrentCycle()
    const periodMonth = cycle?.periodMonth ?? new Date().toLocaleString("en-US", { month: "long" })
    const periodYear = cycle?.periodYear ?? new Date().getFullYear()

    const config = await KpiConfig.findOne({ periodMonth, periodYear })
    const kpis = config?.kpis?.length ? config.kpis : KpiConfig.DEFAULT_KPI_CONFIG

    return NextResponse.json({ kpis, periodMonth, periodYear }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load KPI config" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user as any)?.roleLevel < 3) {
      return NextResponse.json({ error: "Only admins can update KPI configuration" }, { status: 403 })
    }

    const body = await req.json()
    const kpis = normalizeKpis(body?.kpis)

    if (!kpis) {
      return NextResponse.json(
        { error: "Provide valid KPI entries (name, weight, source, missingPolicy) that total 100%" },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KpiConfig = require("@/database/KpiConfig")
    await connectDB()

    const cycle = await getCurrentCycle()
    const periodMonth = cycle?.periodMonth ?? new Date().toLocaleString("en-US", { month: "long" })
    const periodYear = cycle?.periodYear ?? new Date().getFullYear()

    // Upsert: this is THE config for the period — every member's score
    // recalculation (see /api/admin/performance) reads from here.
    const config = await KpiConfig.findOneAndUpdate(
      { periodMonth, periodYear },
      { periodMonth, periodYear, kpis },
      { new: true, upsert: true, runValidators: true }
    )

    const { logAdminActivity } = await import("@/lib/activity-log")
    await logAdminActivity({
      actor: { id: session.user.id, name: session.user.name, role: (session.user as any).role },
      category: "KPI Configuration",
      action: "edit",
      description: `Updated the KPI configuration for ${periodMonth} ${periodYear} (${kpis.map((k) => `${k.name} ${k.weight}%`).join(", ")})`,
      targetType: "KpiConfig",
      targetId: config._id.toString(),
      targetLabel: `${periodMonth} ${periodYear}`,
    })

    return NextResponse.json({ kpis: config.kpis, periodMonth, periodYear }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save KPI config" }, { status: 500 })
  }
}