/**
 * AuditLog model — traceability for modifications to submitted performance data
 * and member probation actions.
 *
 * One document per admin edit, flag/unflag, team-leader assignment on a
 * PerformanceRecord, or probation set/clear on a User. The `record`,
 * `periodMonth`, and `periodYear` fields are optional for probation events
 * that are not tied to a specific PerformanceRecord.
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

const auditLogSchema = new mongoose.Schema(
  {
    // null for probation events not tied to a specific PerformanceRecord.
    record: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PerformanceRecord",
      required: false,
      default: null,
      index: true,
    },
    // Whose record/profile was modified (denormalized so logs survive deletion).
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    periodMonth: { type: String, required: false, default: null },
    periodYear: { type: Number, required: false, default: null },

    // Who made the change.
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: { type: String, required: true }, // snapshot at time of change
    actorRole: { type: String, default: null },

    action: {
      type: String,
      required: true,
      enum: ["edit", "flag", "unflag", "assign", "probation_set", "probation_cleared"],
    },
    changes: { type: [changeSchema], default: [] },
    note: { type: String, trim: true, maxlength: 1000, default: null }, // e.g. flag reason
  },
  { timestamps: true } // createdAt = "when"
)

auditLogSchema.index({ record: 1, createdAt: -1 })

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema)
