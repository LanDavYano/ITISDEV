/**
 * Server-side helpers shared by the performance-submission APIs.
 * (Server only — imports the database layer; do not use in client components.)
 */

/** A cycle is open when it isn't archived/manually closed and the deadline hasn't passed. */
export function isCycleOpen(cycle: any): boolean {
  if (!cycle) return false
  if (cycle.isArchived) return false
  if (cycle.isManuallyClosed) return false
  return new Date() <= new Date(cycle.submissionDeadline)
}

/**
 * The current cycle = the most recently created cycle that is still open.
 * Falls back to the most recently created cycle overall (open or closed) only
 * when none are open, so admins retain the 3-day window to extend a cycle
 * that just closed. A newer cycle that's been closed/archived (e.g. a test
 * cycle) must never shadow an older cycle that's still open for submission.
 */
export async function getCurrentCycle() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EvaluationCycle } = require("@/database")
  const openCycle = await EvaluationCycle.findOne({
    isArchived: false,
    isManuallyClosed: false,
    submissionDeadline: { $gte: new Date() },
  }).sort({ createdAt: -1, updatedAt: -1 })
  if (openCycle) return openCycle
  return EvaluationCycle.findOne().sort({ createdAt: -1, updatedAt: -1 })
}

/** Serialize a cycle for API responses with its computed open/locked state. */
export function cycleSummary(cycle: any) {
  if (!cycle) return null
  return {
    _id: cycle._id,
    periodMonth: cycle.periodMonth,
    periodYear: cycle.periodYear,
    submissionDeadline: cycle.submissionDeadline,
    isManuallyClosed: cycle.isManuallyClosed,
    isArchived: cycle.isArchived,
    isOpen: isCycleOpen(cycle),
  }
}

/** Field-level diff between a record and incoming updates (only changed fields). */
export function diffFields(
  record: any,
  updates: Record<string, any>,
  fields: string[]
): { field: string; from: any; to: any }[] {
  const changes: { field: string; from: any; to: any }[] = []
  for (const field of fields) {
    if (!(field in updates)) continue
    const from = record[field] ?? null
    const to = updates[field] ?? null
    if (String(from) !== String(to)) changes.push({ field, from, to })
  }
  return changes
}

/** Write an audit-log entry for a modification to a performance record. */
export async function writeAuditLog(opts: {
  record: any
  actor: { id: string; name?: string | null; role?: string | null }
  action: "edit" | "flag" | "unflag" | "assign"
  changes?: { field: string; from: any; to: any }[]
  note?: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AuditLog, User } = require("@/database")
  await AuditLog.create({
    record: opts.record._id,
    targetUser: opts.record.user,
    periodMonth: opts.record.periodMonth,
    periodYear: opts.record.periodYear,
    actor: opts.actor.id,
    actorName: opts.actor.name ?? "Unknown",
    actorRole: opts.actor.role ?? null,
    action: opts.action,
    changes: opts.changes ?? [],
    note: opts.note ?? null,
  })

  // Mirror into the global Admin Activity Log (real-time feed).
  try {
    const { logAdminActivity } = await import("@/lib/activity-log")
    const target = await User.findById(opts.record.user).select("firstName lastName").lean()
    const name = target ? `${target.firstName} ${target.lastName}` : "a member"
    const period = `${opts.record.periodMonth} ${opts.record.periodYear}`
    const description =
      opts.action === "edit"
        ? `Edited the performance record of ${name} (${period})`
        : opts.action === "assign"
          ? `Updated assigned counts / VP rating for ${name} (${period})`
          : opts.action === "flag"
            ? `Flagged the submission of ${name} (${period})${opts.note ? ` — “${opts.note}”` : ""}`
            : `Removed the flag on ${name}'s submission (${period})`
    await logAdminActivity({
      actor: opts.actor,
      category: "Performance Records",
      action: opts.action,
      description,
      targetType: "PerformanceRecord",
      targetId: String(opts.record._id),
      targetLabel: name,
      changes: opts.changes,
    })
  } catch {
    /* the global feed must never break the primary action */
  }
}

/** Validate the member-submitted portion of the form. Returns an error string or null. */
export function validateMemberSubmission(body: any): string | null {
  const personalGoal = typeof body.personalGoal === "string" ? body.personalGoal.trim() : ""
  const professionalGoal = typeof body.professionalGoal === "string" ? body.professionalGoal.trim() : ""
  if (!personalGoal) return "Personal goal is required."
  if (!professionalGoal) return "Professional goal is required."
  if (personalGoal.length < 60 || professionalGoal.length < 60)
    return "Goals must be at least 60 characters."
  if (personalGoal.length > 2000 || professionalGoal.length > 2000)
    return "Goals must be 2000 characters or fewer."

  for (const key of ["personalRating", "professionalRating"] as const) {
    const value = body[key]
    if (value === null || value === undefined || value === "")
      return `${key === "personalRating" ? "Personal" : "Professional"} rating is required.`
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0 || num > 100)
      return `${key === "personalRating" ? "Personal" : "Professional"} rating must be between 0 and 100.`
  }
  return null
}

/** Validate team-leader-assigned counts. Returns an error string or null. */
export function validateAssignedCounts(body: any): string | null {
  const fields = [
    "deliverablesAssigned",
    "deliverablesAnswered",
    "meetingsTotal",
    "meetingsAttended",
  ] as const
  for (const key of fields) {
    if (!(key in body)) continue
    const num = Number(body[key])
    if (!Number.isInteger(num) || num < 0)
      return `${key} must be a whole number of 0 or more.`
  }
  const assigned = Number(body.deliverablesAssigned)
  const answered = Number(body.deliverablesAnswered)
  if ("deliverablesAssigned" in body && "deliverablesAnswered" in body && answered > assigned)
    return "Deliverables answered cannot exceed deliverables assigned."
  const total = Number(body.meetingsTotal)
  const attended = Number(body.meetingsAttended)
  if ("meetingsTotal" in body && "meetingsAttended" in body && attended > total)
    return "Meetings attended cannot exceed total meetings."
  return null
}

/** A single named+described deliverable/meeting item, as sent by the client. */
export interface AssignedItemInput {
  _id?: string
  name: string
  description?: string
  completed?: boolean
}

/** Validate a list of assigned items. Returns an error string or null. */
export function validateAssignedItems(items: any, label: string): string | null {
  if (!Array.isArray(items)) return `${label} must be a list.`
  for (const item of items) {
    const name = typeof item?.name === "string" ? item.name.trim() : ""
    if (!name) return `Every ${label.slice(0, -1).toLowerCase()} needs a name.`
    if (name.length > 150) return `${label} names must be 150 characters or fewer.`
    const description = typeof item?.description === "string" ? item.description : ""
    if (description.length > 1000) return `${label} descriptions must be 1000 characters or fewer.`
  }
  return null
}

/**
 * Merge incoming deliverable/meeting items against the record's existing
 * ones (matched by `_id`), preserving `completedAt`/`notifiedAt` history for
 * unchanged items and computing them fresh for newly-added or newly-completed
 * ones. Marking an item completed clears any pending `notifiedAt` — the
 * member's notification has been acted on.
 */
export function buildAssignedItems(existingItems: any[], incoming: AssignedItemInput[]) {
  const existingById = new Map(
    (existingItems ?? []).map((it: any) => [it._id.toString(), it])
  )
  const now = new Date()
  return incoming.map((input) => {
    const name = String(input.name ?? "").trim()
    const description = String(input.description ?? "").trim()
    const completed = Boolean(input.completed)
    const existing = input._id ? existingById.get(String(input._id)) : null

    if (existing) {
      return {
        _id: existing._id,
        name,
        description,
        completed,
        completedAt: completed ? (existing.completed ? existing.completedAt : now) : null,
        notifiedAt: completed ? null : existing.notifiedAt,
      }
    }
    return {
      name,
      description,
      completed,
      completedAt: completed ? now : null,
      notifiedAt: null,
    }
  })
}

/** Derive the review status shown to admins. */
export function submissionStatus(record: any): "Submitted" | "Submitted with flags" | "Not submitted" {
  if (!record || !record.submittedAt) return "Not submitted"
  return record.isFlagged ? "Submitted with flags" : "Submitted"
}

/** Member-editable fields (the rating submission). */
export const MEMBER_FIELDS = [
  "personalGoal",
  "professionalGoal",
  "personalRating",
  "professionalRating",
] as const

/** Team-leader-editable fields (assigned counts). */
export const ASSIGNMENT_FIELDS = [
  "deliverablesAssigned",
  "deliverablesAnswered",
  "meetingsTotal",
  "meetingsAttended",
] as const

/** The manual-source KPI name a VP's rating is stored under in PerformanceRecord.kpis. */
export const VP_RATING_KPI_NAME = "VP Rating"
