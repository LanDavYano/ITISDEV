/**
 * Department model.
 *
 * SQL origin: `department` table.
 * `deptLeader` replaces the circular dept_leader_id FK and references a User.
 * It is nullable (a department may have no assigned leader).
 */

const { mongoose } = require("./db")

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    officeType: {
      type: String,
      required: true,
      enum: ["Front Office", "Back Office"],
    },
    deptLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
)

module.exports =
  mongoose.models.Department || mongoose.model("Department", departmentSchema)
