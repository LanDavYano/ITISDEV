import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const DEFAULT_KPI_CONFIG = [
  { name: "Performance Score", weight: 35 },
  { name: "Engagement", weight: 35 },
  { name: "Evaluation", weight: 15 },
  { name: "Timeliness", weight: 5 },
  { name: "VP Rating", weight: 10 },
]

function normalizeKpis(input: unknown) {
  if (!Array.isArray(input)) return null
  const normalized = input
    .map((entry: any) => ({
      name: typeof entry?.name === "string" ? entry.name.trim() : "",
      weight: Number(entry?.weight),
    }))
    .filter((entry) => entry.name)

  if (normalized.length === 0) return null
  if (normalized.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) return null

  const total = normalized.reduce((sum, entry) => sum + entry.weight, 0)
  if (Math.abs(total - 100) > 0.001) return null

  return normalized
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const record = await PerformanceRecord.findOne({
      user: session.user.id,
    }).sort({ createdAt: -1 })

    const kpis = record?.kpis?.length ? record.kpis : DEFAULT_KPI_CONFIG

    return NextResponse.json({ kpis }, { status: 200 })
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
      return NextResponse.json({ error: "Provide valid KPI names and weights that total 100%" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, PerformanceRecord } = require("@/database")
    await connectDB()

    const currentCycle = await require("@/database").EvaluationCycle
      .findOne()
      .sort({ createdAt: -1, updatedAt: -1 })

    const record = await PerformanceRecord.findOne({ user: session.user.id }).sort({ createdAt: -1 })

    if (record) {
      record.kpis = kpis
      await record.save()
      return NextResponse.json({ kpis: record.kpis }, { status: 200 })
    }

    const created = await PerformanceRecord.create({
      user: session.user.id,
      periodMonth: currentCycle?.periodMonth || new Date().toLocaleString("en-US", { month: "long" }),
      periodYear: currentCycle?.periodYear || new Date().getFullYear(),
      kpis,
    })

    return NextResponse.json({ kpis: created.kpis }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save KPI config" }, { status: 500 })
  }
}
