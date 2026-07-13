/**
 * KpiConfig — the canonical KPI weighting/scoring configuration for a
 * single evaluation period (periodMonth + periodYear).
 *
 * This replaces reading/writing `kpis` off an individual user's
 * PerformanceRecord. That approach meant an admin editing their own
 * KPI weights never affected anyone else's record — there was no
 * single source of truth for "the KPI config for this period."
 *
 * PerformanceRecord.kpis should now only be used for per-member MANUAL
 * scores (e.g. "VP Rating" entered by a reviewer) — matched by `name`
 * against this collection's `source: "manual"` entries. Weight, source,
 * cutoff, and missing-data policy all live here instead.
 */

const { mongoose } = require("./db")

const kpiConfigSchema = new mongoose.Schema(
  {
    periodMonth: { type: String, required: true },
    periodYear: { type: Number, required: true, min: 2000, max: 2100 },

    kpis: {
      type: [
        {
          name: { type: String, required: true, trim: true, maxlength: 100 },
          weight: { type: Number, required: true, min: 0, max: 100 },
          source: {
            type: String,
            required: true,
            enum: ["rating", "attendance", "deliverables", "timeliness", "manual"],
          },
          required: { type: Boolean, default: false },
          cutoff: { type: Number, min: 0, max: 100, default: null },
          missingPolicy: {
            type: String,
            required: true,
            enum: ["exclude", "flag", "default"],
            default: "flag",
          },
          defaultValue: { type: Number, min: 0, max: 100, default: null },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

// One config per evaluation period.
kpiConfigSchema.index({ periodYear: 1, periodMonth: 1 }, { unique: true })

kpiConfigSchema.pre("validate", function validateWeightTotal() {
  if (this.kpis.length === 0) return
  const total = this.kpis.reduce((sum, k) => sum + k.weight, 0)
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`KPI weights must total 100% (currently ${total}%)`)
  }
  for (const k of this.kpis) {
    if (k.missingPolicy === "default" && k.defaultValue == null) {
      throw new Error(`${k.name}: missing-data policy "default" requires a defaultValue`)
    }
  }
})

// Reasonable defaults for a brand-new period, mapping the org's existing
// five KPI names to a source. Confirm "Timeliness" and "VP Rating" match
// intent — those two are the least obvious mappings.
const DEFAULT_KPI_CONFIG = [
  { name: "Performance Score", weight: 35, source: "rating", required: true, missingPolicy: "flag" },
  { name: "Engagement", weight: 35, source: "attendance", required: true, missingPolicy: "flag" },
  { name: "Evaluation", weight: 15, source: "deliverables", required: false, missingPolicy: "flag" },
  { name: "Timeliness", weight: 5, source: "timeliness", required: false, missingPolicy: "default", defaultValue: 100 },
  { name: "VP Rating", weight: 10, source: "manual", required: false, missingPolicy: "exclude" },
]

module.exports = mongoose.models.KpiConfig || mongoose.model("KpiConfig", kpiConfigSchema)
module.exports.DEFAULT_KPI_CONFIG = DEFAULT_KPI_CONFIG