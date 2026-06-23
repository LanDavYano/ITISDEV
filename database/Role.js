/**
 * Role model — reference collection with 3 fixed roles.
 *
 * SQL origin: `role` table (role_id, role_title).
 * `level` preserves the original numeric role_id so existing access-control
 * logic (1 = Member, 2 = Team Leader of Sub Department, 3 = Leader of
 * Department) keeps working. Level 3 shares admin-level access.
 */

const { mongoose } = require("./db")

const roleSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 3,
    },
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.models.Role || mongoose.model("Role", roleSchema)
