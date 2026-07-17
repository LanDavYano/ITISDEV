import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/admin/activity — the Admin Activity Log feed.
 *
 * Access: executive members / performance managers (roleLevel 2+).
 * Query params:
 *   - category: filter to one category (omit or "All" for everything)
 *   - limit:    max entries (default 300, cap 1000)
 *
 * Returns entries newest-first; the UI groups them day-by-day. The client
 * polls this endpoint so actions performed on other devices/sessions appear
 * in near-real-time.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, AdminActivityLog } = require("@/database")
    await connectDB()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const limit = Math.min(Number(searchParams.get("limit")) || 300, 1000)

    const filter: Record<string, any> = {}
    if (category && category !== "All") filter.category = category

    const logs = await AdminActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      logs,
      categories: AdminActivityLog.CATEGORIES,
    })
  } catch (err) {
    console.error("[GET /api/admin/activity]", err)
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 })
  }
}
