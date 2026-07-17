/**
 * Server-side helpers for the System Announcements APIs.
 * (Server only — do not import in client components.)
 */

/** Validate title/content/expiresAt from a create or edit payload. */
export function validateAnnouncement(body: any, { partial = false } = {}): string | null {
  if (!partial || "title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) return "Title is required."
    if (title.length > 200) return "Title must be 200 characters or fewer."
  }
  if (!partial || "content" in body) {
    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) return "Message content is required."
    if (content.length > 5000) return "Message content must be 5000 characters or fewer."
  }
  if ("expiresAt" in body && body.expiresAt !== null && body.expiresAt !== "") {
    const date = new Date(body.expiresAt)
    if (isNaN(date.getTime())) return "Expiration must be a valid date."
  }
  return null
}

/** Normalize an expiresAt input to Date | null. */
export function parseExpiresAt(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null
  return new Date(value)
}

/** Status shown in the PM team's history tab. */
export function announcementStatus(a: any): "Active" | "Expired" | "Deleted" {
  if (a.isDeleted) return "Deleted"
  if (a.expiresAt && new Date(a.expiresAt) <= new Date()) return "Expired"
  return "Active"
}

/** Write a history-log entry for an announcement action. */
export async function writeAnnouncementLog(opts: {
  announcement: any
  actor: { id: string; name?: string | null; role?: string | null }
  action: "create" | "edit" | "delete"
  changes?: { field: string; from: any; to: any }[]
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AnnouncementLog } = require("@/database")
  await AnnouncementLog.create({
    announcement: opts.announcement._id,
    titleSnapshot: opts.announcement.title,
    action: opts.action,
    changes: opts.changes ?? [],
    actor: opts.actor.id,
    actorName: opts.actor.name ?? "Unknown",
    actorRole: opts.actor.role ?? null,
  })

  // Mirror into the global Admin Activity Log (real-time feed).
  try {
    const { logAdminActivity } = await import("@/lib/activity-log")
    const verb =
      opts.action === "create" ? "Published" : opts.action === "edit" ? "Edited" : "Deleted"
    await logAdminActivity({
      actor: opts.actor,
      category: "Announcements",
      action: opts.action,
      description: `${verb} announcement “${opts.announcement.title}”`,
      targetType: "Announcement",
      targetId: String(opts.announcement._id),
      targetLabel: opts.announcement.title,
      changes: opts.changes,
    })
  } catch {
    /* the global feed must never break the primary action */
  }
}
