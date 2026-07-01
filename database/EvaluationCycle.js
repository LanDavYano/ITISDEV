/**
 * EvaluationCycle model — one record per month/year period.
 * Tracks the submission deadline set by the performance manager.
 * isOpen is computed on-the-fly: now <= submissionDeadline (APMP-59)
 */

const { mongoose } = require("./db")

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const evaluationCycleSchema = new mongoose.Schema(
  {
    periodMonth: { type: String, required: true, enum: MONTHS },
    periodYear:  { type: Number, required: true, min: 2000, max: 2100 },
    submissionDeadline: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
)

// One cycle per period
evaluationCycleSchema.index({ periodYear: 1, periodMonth: 1 }, { unique: true })

// Virtual: is the deadline still in the future? (APMP-59 auto-closure logic)
evaluationCycleSchema.virtual("isOpen").get(function () {
  return new Date() <= this.submissionDeadline
})

evaluationCycleSchema.set("toJSON",   { virtuals: true })
evaluationCycleSchema.set("toObject", { virtuals: true })

module.exports =
  mongoose.models.EvaluationCycle ||
  mongoose.model("EvaluationCycle", evaluationCycleSchema)

module.exports.MONTHS = MONTHS
