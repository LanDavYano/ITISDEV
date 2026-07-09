/**
 * Announcement model — system-wide announcements posted by the PM team,
 * shown to all users when they log in.
 *
 * Visibility rules:
 *  - Active   = not deleted AND (no expiry OR expiry in the future)
 *  - Expired  = not deleted AND expiry in the past   → hidden from users
 *  - Deleted  = soft-deleted (kept for the history/logs tab) → hidden from users
 */

const { mongoose } = require("./db")

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },

    // Posting date shown to users (createdAt also exists via timestamps).
    postedAt: { type: Date, default: Date.now },

    // Validity period: null = never expires.
    expiresAt: { type: Date, default: null },

    // Soft delete — deleted announcements stay in the history tab.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: { type: String, required: true }, // snapshot for history
  },
  { timestamps: true }
)

announcementSchema.index({ isDeleted: 1, expiresAt: 1, postedAt: -1 })

/** Query filter for announcements users should currently see. */
announcementSchema.statics.activeFilter = function activeFilter() {
  return {
    isDeleted: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }
}

module.exports =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema)
