/**
 * EvaluationCycle model — one record per month/year period.
 * Tracks the submission deadline set by the performance manager.
 * isOpen is computed on-the-fly using deadline and manual closure state.
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
    isManuallyClosed: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, autoIndex: false }
)

// One active cycle per period; archived cycles stay in history without blocking new ones.
evaluationCycleSchema.index(
  { periodYear: 1, periodMonth: 1 },
  { unique: true, partialFilterExpression: { isArchived: false } }
)

// Virtual: cycle is open when it is not manually closed and deadline is still in the future.
evaluationCycleSchema.virtual("isOpen").get(function () {
  if (this.isArchived) return false
  if (this.isManuallyClosed) return false
  return new Date() <= this.submissionDeadline
})

evaluationCycleSchema.set("toJSON",   { virtuals: true })
evaluationCycleSchema.set("toObject", { virtuals: true })

const EvaluationCycle =
  mongoose.models.EvaluationCycle ||
  mongoose.model("EvaluationCycle", evaluationCycleSchema)

let indexSyncPromise = null

async function ensureIndexes() {
  if (!indexSyncPromise) {
    indexSyncPromise = EvaluationCycle.syncIndexes().catch((error) => {
      indexSyncPromise = null
      throw error
    })
  }

  return indexSyncPromise
}

EvaluationCycle.ensureIndexes = ensureIndexes

module.exports = EvaluationCycle
module.exports.MONTHS = MONTHS
