/**
 * SubDepartment model.
 *
 * SQL origin: `sub_department` table.
 * - `department` references the parent Department (required).
 * - `subDeptLeader` references a User (nullable).
 * - Compound unique index mirrors uq_subdept_in_dept (department, name): a
 *   sub-department name must be unique within its department.
 */

const { mongoose } = require("./db")

const subDepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    subDeptLeader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
)

subDepartmentSchema.index({ department: 1, name: 1 }, { unique: true })

module.exports =
  mongoose.models.SubDepartment ||
  mongoose.model("SubDepartment", subDepartmentSchema)
