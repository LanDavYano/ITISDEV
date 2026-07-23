/**
 * Notification model — a persisted inbox entry, e.g. a member telling their
 * team leader "I've finished this deliverable/meeting" via
 * POST /api/performance/notify.
 *
 * `itemName`/`periodMonth`/`periodYear` are denormalized snapshots so a
 * notification still reads sensibly even if the source item is later
 * edited, completed, or removed.
 */

const { mongoose } = require("./db")

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    record: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PerformanceRecord",
      required: true,
    },
    itemType: { type: String, required: true, enum: ["deliverable", "meeting"] },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: { type: String, required: true },
    periodMonth: { type: String, required: true },
    periodYear: { type: Number, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
)

notificationSchema.index({ recipient: 1, createdAt: -1 })

module.exports =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema)
