/**
 * AnnouncementLog model — history trail for the PM team's announcements tab.
 *
 * One document per create / edit / delete of an Announcement: who did it,
 * what changed (field-level before/after for edits), and when (createdAt).
 * Title is snapshotted so the history stays readable after deletion.
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

const announcementLogSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
      index: true,
    },
    titleSnapshot: { type: String, required: true },

    action: {
      type: String,
      required: true,
      enum: ["create", "edit", "delete"],
    },
    changes: { type: [changeSchema], default: [] },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: { type: String, required: true },
    actorRole: { type: String, default: null },
  },
  { timestamps: true } // createdAt = when it happened
)

announcementLogSchema.index({ createdAt: -1 })

module.exports =
  mongoose.models.AnnouncementLog ||
  mongoose.model("AnnouncementLog", announcementLogSchema)
