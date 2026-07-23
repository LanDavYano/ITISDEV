/**
 * PerformanceRecord model — one submission per member, per month/year cycle.
 *
 * Two groups of fields, written by different roles:
 *
 *  MEMBER-SUBMITTED (the "rating submission", done by all members incl. team leaders):
 *   - personalGoal / professionalGoal        → Qualitative Answers (strings)
 *   - personalRating / professionalRating    → Quantitative Answers (0–100)
 *   - submittedAt                            → set when the member submits the form
 *
 *  TEAM-LEADER-ASSIGNED (per member, by the leader of their sub-department):
 *   - deliverables / meetings         → itemized {name, description, completed}
 *   - deliverablesAssigned / deliverablesAnswered  → derived from deliverables[]
 *   - meetingsTotal / meetingsAttended             → derived from meetings[]
 *
 *  ADMIN REVIEW (data-integrity checks before evaluation is finalized):
 *   - isFlagged / flagReason / flaggedBy / flaggedAt
 *
 * Constraints kept from the original SQL schema:
 *  - unique (user, periodYear, periodMonth)
 *  - ratings 0..100, periodYear 2000..2100
 *  - deliverablesAnswered <= deliverablesAssigned
 *  - meetingsAttended <= meetingsTotal
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

const DEFAULT_KPI_CONFIG = [
  { name: "Performance Score", weight: 35 },
  { name: "Engagement", weight: 35 },
  { name: "Evaluation", weight: 15 },
  { name: "Timeliness", weight: 5 },
]

// "VP Rating" is intentionally NOT defaulted onto a new record. It is a
// manual-source KPI (see KpiConfig.js) — an entry only appears in `kpis`
// once a VP actually rates the member (see PATCH /api/team/records/[userId]).
// Defaulting it to a score of 0 would silently drag every unrated member's
// final score down instead of correctly excluding it as missing data.
const buildDefaultKpiConfig = () =>
  DEFAULT_KPI_CONFIG.map((kpi) => ({ name: kpi.name, weight: kpi.weight }))

const nonNegativeInt = {
  type: Number,
  default: 0,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: "{PATH} must be a whole number",
  },
}

// A single named, described assignment (deliverable or meeting). `completed`
// is team-leader-controlled only; `notifiedAt` is set when the member signals
// (via /api/performance/notify) that they believe it's done.
const assignedItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

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

    // ── Qualitative Answers (member-submitted, string) ──────────────────────
    personalGoal: { type: String, trim: true, minlength: 60, maxlength: 2000, default: null },
    professionalGoal: { type: String, trim: true, minlength: 60, maxlength: 2000, default: null },

    // ── Quantitative Answers (member-submitted, 0–100) ──────────────────────
    personalRating: { type: Number, min: 0, max: 100, default: null },
    professionalRating: { type: Number, min: 0, max: 100, default: null },

    // KPI configuration snapshot tied to this user-specific performance record.
    kpis: {
      type: [
        {
          name: { type: String, required: true, trim: true, maxlength: 100 },
          weight: { type: Number, required: true, min: 0, max: 100 },
          score: { type: Number, default: 0 },
        },
      ],
      default: buildDefaultKpiConfig,
    },

    // Set when the member submits their form; null = not submitted yet
    // (a record can exist beforehand if the team leader already assigned counts).
    submittedAt: { type: Date, default: null },

    // ── Team-leader-assigned items (named + described) ──────────────────────
    deliverables: { type: [assignedItemSchema], default: [] },
    meetings: { type: [assignedItemSchema], default: [] },

    // ── Team-leader-assigned counts — derived from deliverables/meetings
    // above (assigned/total = item count, answered/attended = completed
    // count) whenever those arrays are written via PATCH /api/team/records/
    // [userId]. Kept as real fields (not virtuals) because lib/scoring.ts and
    // /api/admin/stats read them directly. ──────────────────────────────────
    deliverablesAssigned: nonNegativeInt,
    deliverablesAnswered: nonNegativeInt,
    meetingsTotal: nonNegativeInt,
    meetingsAttended: nonNegativeInt,

    // ── Admin review / flagging ──────────────────────────────────────────────
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String, trim: true, maxlength: 1000, default: null },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    flaggedAt: { type: Date, default: null },
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
module.exports.DEFAULT_KPI_CONFIG = DEFAULT_KPI_CONFIG
