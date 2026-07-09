import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { announcementStatus } from "@/lib/announcements"

/**
 * GET /api/announcements/history — the PM team's full announcement history:
 * every announcement (including expired and deleted ones, each labeled with
 * its status) plus the action log (created / edited / deleted, by whom, when,
 * and what changed).
 *
 * Access: admin-level (roleLevel 2+). Regular members only ever see the
 * active list via GET /api/announcements.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Announcement, AnnouncementLog } = require("@/database")
    await connectDB()

    const [announcements, logs] = await Promise.all([
      Announcement.find().sort({ postedAt: -1 }).lean(),
      AnnouncementLog.find().sort({ createdAt: -1 }).limit(200).lean(),
    ])

    return NextResponse.json({
      announcements: announcements.map((a: any) => ({
        ...a,
        status: announcementStatus(a),
      })),
      logs,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch announcement history" }, { status: 500 })
  }
}
