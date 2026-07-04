/**
 * AuditLog model — traceability for modifications to submitted performance data.
 *
 * One document per admin edit, flag/unflag, or team-leader assignment on a
 * PerformanceRecord: who made the change (actor), what changed (field-level
 * before/after), and when (createdAt via timestamps).
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
    record: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PerformanceRecord",
      required: true,
      index: true,
    },
    // Whose submission was modified (denormalized so logs survive record deletion).
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    periodMonth: { type: String, required: true },
    periodYear: { type: Number, required: true },

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
      enum: ["edit", "flag", "unflag", "assign"],
    },
    changes: { type: [changeSchema], default: [] },
    note: { type: String, trim: true, maxlength: 1000, default: null }, // e.g. flag reason
  },
  { timestamps: true } // createdAt = "when"
)

auditLogSchema.index({ record: 1, createdAt: -1 })

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema)
