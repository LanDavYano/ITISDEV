/**
 * PerformanceRecord model — the "Input Data": one submission per member, per
 * month/year period.
 *
 * SQL origin: `performance_record` table.
 * Constraints carried over:
 *  - uq_record_per_period           → compound unique (user, periodYear, periodMonth)
 *  - chk_rating_range               → quantitativeRating 0..100
 *  - chk_answered_le_assigned       → deliverablesAnswered <= deliverablesAssigned
 *  - chk_attended_le_total          → meetingsAttended <= meetingsTotal
 *  - chk_period_year                → periodYear 2000..2100
 */

const { mongoose } = require("./db")

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const performanceRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    periodMonth: { type: String, required: true, enum: MONTHS },
    periodYear: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    deliverablesAssigned: { type: Number, default: 0, min: 0 },
    deliverablesAnswered: { type: Number, default: 0, min: 0 },
    meetingsTotal: { type: Number, default: 0, min: 0 },
    meetingsAttended: { type: Number, default: 0, min: 0 },
    qualitativeAnswer: { type: String, default: null },
    quantitativeRating: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
)

// One record per user per period.
performanceRecordSchema.index(
  { user: 1, periodYear: 1, periodMonth: 1 },
  { unique: true }
)

// Cross-field validations (the CHECK constraints from SQL).
// (Mongoose 9 async middleware resolves on return / rejects on throw.)
performanceRecordSchema.pre("validate", async function validateRecord() {
  if (this.deliverablesAnswered > this.deliverablesAssigned) {
    throw new Error("deliverablesAnswered cannot exceed deliverablesAssigned")
  }
  if (this.meetingsAttended > this.meetingsTotal) {
    throw new Error("meetingsAttended cannot exceed meetingsTotal")
  }
})

module.exports =
  mongoose.models.PerformanceRecord ||
  mongoose.model("PerformanceRecord", performanceRecordSchema)

module.exports.MONTHS = MONTHS
