import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  validateAnnouncement,
  parseExpiresAt,
  writeAnnouncementLog,
} from "@/lib/announcements"

/** Both mutations below are Performance-Manager-only (roleLevel 3). */
async function guard() {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized", status: 401 as const }
  if ((session.user.roleLevel ?? 1) < 3) {
    return {
      error: "Only Performance Managers can manage announcements.",
      status: 403 as const,
    }
  }
  return { session }
}

/**
 * PATCH /api/announcements/[id] — edit an announcement's title, content,
 * and/or validity period. Field-level changes are recorded in the history log.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await guard()
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { session } = auth

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Announcement } = require("@/database")
    await connectDB()

    const announcement = await Announcement.findById(params.id)
    if (!announcement || announcement.isDeleted) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    const body = await req.json()
    const validationError = validateAnnouncement(body, { partial: true })
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const changes: { field: string; from: any; to: any }[] = []
    const apply = (field: "title" | "content" | "expiresAt", to: any) => {
      const from = announcement[field] ?? null
      if (String(from ?? "") !== String(to ?? "")) {
        changes.push({ field, from, to })
        announcement[field] = to
      }
    }

    if ("title" in body) apply("title", String(body.title).trim())
    if ("content" in body) apply("content", String(body.content).trim())
    if ("expiresAt" in body) apply("expiresAt", parseExpiresAt(body.expiresAt))

    if (changes.length === 0) {
      return NextResponse.json({ announcement }) // nothing changed
    }

    await announcement.save()
    await writeAnnouncementLog({
      announcement,
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      action: "edit",
      changes,
    })

    return NextResponse.json({ announcement })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update announcement" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/announcements/[id] — soft-delete an announcement.
 * It disappears for users immediately but remains in the history tab.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await guard()
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { session } = auth

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Announcement } = require("@/database")
    await connectDB()

    const announcement = await Announcement.findById(params.id)
    if (!announcement || announcement.isDeleted) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    announcement.isDeleted = true
    announcement.deletedAt = new Date()
    announcement.deletedBy = session.user.id
    await announcement.save()

    await writeAnnouncementLog({
      announcement,
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      action: "delete",
    })

    return NextResponse.json({ message: "Announcement deleted." })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete announcement" },
      { status: 500 }
    )
  }
}
