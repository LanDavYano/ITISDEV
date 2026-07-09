import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  validateAnnouncement,
  parseExpiresAt,
  writeAnnouncementLog,
} from "@/lib/announcements"

/**
 * GET /api/announcements — active system-wide announcements.
 *
 * Visible to every authenticated user (all roles). Read-only: viewing
 * announcements never touches the user's own data. Expired and deleted
 * announcements are excluded.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Announcement } = require("@/database")
    await connectDB()

    const announcements = await Announcement.find(Announcement.activeFilter())
      .sort({ postedAt: -1 })
      .select("title content postedAt expiresAt createdByName")
      .lean()

    return NextResponse.json({ announcements })
  } catch {
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 })
  }
}

/**
 * POST /api/announcements — create and publish an announcement.
 *
 * Performance Managers only (roleLevel 3). Requires title + message content;
 * `expiresAt` is optional (null = never expires). Logged to the history tab.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user.roleLevel ?? 1) < 3) {
      return NextResponse.json(
        { error: "Only Performance Managers can create announcements." },
        { status: 403 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Announcement } = require("@/database")
    await connectDB()

    const body = await req.json()
    const validationError = validateAnnouncement(body)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const announcement = await Announcement.create({
      title: String(body.title).trim(),
      content: String(body.content).trim(),
      expiresAt: parseExpiresAt(body.expiresAt),
      postedAt: new Date(),
      createdBy: session.user.id,
      createdByName: session.user.name ?? "Unknown",
    })

    await writeAnnouncementLog({
      announcement,
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      action: "create",
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create announcement" },
      { status: 500 }
    )
  }
}
