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

/** The current cycle = most recently created one (same convention as /api/cycles/current). */
export async function getCurrentCycle() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EvaluationCycle } = require("@/database")
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
  const { AuditLog } = require("@/database")
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
}

/** Validate the member-submitted portion of the form. Returns an error string or null. */
export function validateMemberSubmission(body: any): string | null {
  const personalGoal = typeof body.personalGoal === "string" ? body.personalGoal.trim() : ""
  const professionalGoal = typeof body.professionalGoal === "string" ? body.professionalGoal.trim() : ""
  if (!personalGoal) return "Personal goal is required."
  if (!professionalGoal) return "Professional goal is required."
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
