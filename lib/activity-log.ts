/**
 * Admin activity logging (server only).
 *
 * logAdminActivity() writes one entry into the global AdminActivityLog feed —
 * called from the same request that performs the admin action, so logging is
 * real-time and automatic. Device, user-agent, and IP are read from the
 * request headers for multi-device / session traceability.
 *
 * Logging must never break the action itself: all failures are swallowed
 * after a console warning.
 */

import { headers } from "next/headers"

export type ActivityCategory =
  | "Member Management"
  | "Department Management"
  | "Deadline Management"
  | "KPI Configuration"
  | "Announcements"
  | "Performance Records"

interface ActorLike {
  id: string
  name?: string | null
  role?: string | null
}

interface LogOptions {
  actor: ActorLike
  category: ActivityCategory
  action: string // "create" | "edit" | "delete" | "open" | "close" | "extend" | "flag" | …
  description: string // human-readable, e.g. `Added member Juan dela Cruz`
  targetType?: string | null
  targetId?: string | null
  targetLabel?: string | null
  changes?: { field: string; from: any; to: any }[]
}

/** Compact "Chrome on macOS"-style summary from a user-agent string. */
export function summarizeUserAgent(ua: string | null): string | null {
  if (!ua) return null
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("OPR/") || ua.includes("Opera")
      ? "Opera"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Chrome/")
          ? "Chrome"
          : ua.includes("Safari/")
            ? "Safari"
            : ua.startsWith("curl/")
              ? "curl"
              : ua.startsWith("PostmanRuntime")
                ? "Postman"
                : "Unknown browser"
  const os = ua.includes("iPhone")
    ? "iPhone"
    : ua.includes("iPad")
      ? "iPad"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("Mac OS X") || ua.includes("Macintosh")
          ? "macOS"
          : ua.includes("Windows")
            ? "Windows"
            : ua.includes("Linux")
              ? "Linux"
              : null
  return os ? `${browser} on ${os}` : browser
}

export async function logAdminActivity(opts: LogOptions): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, AdminActivityLog } = require("@/database")
    await connectDB()

    // Device / session context from the current request (route-handler scope).
    let userAgent: string | null = null
    let ip: string | null = null
    try {
      const h = headers()
      userAgent = h.get("user-agent")
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        null
    } catch {
      /* headers() unavailable outside a request scope — log without it */
    }

    await AdminActivityLog.create({
      actor: opts.actor.id,
      actorName: opts.actor.name ?? "Unknown",
      actorRole: opts.actor.role ?? null,
      category: opts.category,
      action: opts.action,
      description: opts.description,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      targetLabel: opts.targetLabel ?? null,
      changes: opts.changes ?? [],
      device: summarizeUserAgent(userAgent),
      userAgent,
      ip,
    })
  } catch (err) {
    console.warn("[activity-log] failed to write entry:", err)
  }
}
