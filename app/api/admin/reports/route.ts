import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { buildPerformanceReport, reportToCsv, ReportError } from "@/lib/reports"

/**
 * GET /api/admin/reports?scope=member|subDepartment|department&scopeId=...
 *                        &startCycleId=...&endCycleId=...&format=json|csv
 *
 * Generates a scoped, period-bound performance report (metrics + meeting
 * attendance summary) for the given member, sub-department, or department.
 *
 * Access: roleLevel >= 3 only (Department Leader / "PM Admin") — the same
 * admin gate every other /api/admin/* route uses.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 3) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get("scope")
    const scopeId = searchParams.get("scopeId")
    const startCycleId = searchParams.get("startCycleId")
    const endCycleId = searchParams.get("endCycleId")
    const format = searchParams.get("format") === "csv" ? "csv" : "json"

    const report = await buildPerformanceReport({
      scope,
      scopeId,
      startCycleId,
      endCycleId,
      generatedBy: { id: session.user.id, name: session.user.name },
    })

    if (format === "csv") {
      const filename = `performance-report-${report.scope}-${new Date().toISOString().slice(0, 10)}.csv`
      return new NextResponse(reportToCsv(report), {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(report)
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[GET /api/admin/reports]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
