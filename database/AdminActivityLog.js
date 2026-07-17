/**
 * AdminActivityLog model — the system-wide admin activity feed.
 *
 * One document per admin action, written in the same request that performs
 * the action (real-time). Unlike AuditLog (per performance record) and
 * AnnouncementLog (per announcement), this collection is the single global
 * stream the "Admin Activity Log" tab reads, categorized and day-groupable.
 *
 * Multi-device / session tracking: every entry snapshots the device summary,
 * raw user-agent, and IP of the session that performed the action, so actions
 * are traceable across devices and sessions.
 */

const { mongoose } = require("./db")

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from: { type: mongoose.Schema.Types.Mixed, default: null },
    to: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
)

const CATEGORIES = [
  "Member Management",
  "Department Management",
  "Deadline Management",
  "KPI Configuration",
  "Announcements",
  "Performance Records",
]

const adminActivityLogSchema = new mongoose.Schema(
  {
    // Who did it
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: { type: String, required: true }, // snapshot
    actorRole: { type: String, default: null },

    // What kind of action (for the category filter)
    category: {
      type: String,
      required: true,
      enum: [
        "Member Management",
        "Department Management",
        "Deadline Management",
        "KPI Configuration",
        "Announcements",
        "Performance Records",
      ],
      index: true,
    },
    action: { type: String, required: true }, // e.g. "create" | "edit" | "delete" | "close" | "extend" | "flag"
    description: { type: String, required: true }, // human-readable summary

    // What it acted on (optional, snapshotted so logs outlive the target)
    targetType: { type: String, default: null }, // e.g. "User" | "Department" | "EvaluationCycle"
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    targetLabel: { type: String, default: null },

    // Field-level detail for edits
    changes: { type: [changeSchema], default: [] },

    // Device / session context
    device: { type: String, default: null }, // e.g. "Chrome on macOS"
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true } // createdAt = when it happened
)

adminActivityLogSchema.index({ createdAt: -1 })
adminActivityLogSchema.index({ category: 1, createdAt: -1 })

module.exports =
  mongoose.models.AdminActivityLog ||
  mongoose.model("AdminActivityLog", adminActivityLogSchema)

module.exports.CATEGORIES = CATEGORIES
