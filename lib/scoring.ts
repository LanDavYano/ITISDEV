/**
 * Performance scoring engine.
 *
 * Pure, side-effect-free functions — call this from wherever your
 * server actually holds the data (e.g. an API route or a service
 * function invoked on save/update). Nothing here talks to a database
 * or network; it just takes config + inputs and returns a result you
 * can persist.
 */

// ─── Config (extends your existing KpiItem) ───────────────────────────────

export type KpiSource = "rating" | "attendance" | "deliverables" | "timeliness" | "manual";
export type MissingPolicy = "exclude" | "flag" | "default";

export interface KpiConfig {
  _id?: string;
  name: string;
  weight: number; // percentage points; all KpiConfigs for a period should total 100
  source: KpiSource;
  required: boolean; // if true, missing/below-cutoff on this KPI makes the member ineligible
  cutoff?: number; // minimum normalized (0-100) score to "pass" this KPI
  missingPolicy: MissingPolicy;
  defaultValue?: number; // 0-100, used when missingPolicy === "default"
}

// ─── Raw inputs, matching PerformanceRecord's real fields ────────────────

export interface PerfInputs {
  personalRating: number | null; // 0-100, member-submitted
  professionalRating: number | null; // 0-100, member-submitted
  meetingsTotal: number;
  meetingsAttended: number;
  deliverablesAssigned: number;
  deliverablesAnswered: number;
  submittedAt: Date | string | null; // null = member hasn't submitted yet
  cycleDeadline?: Date | string | null; // for the "timeliness" source
  isFlagged: boolean; // admin data-integrity flag
  manualScores: Record<string, number>; // KPI name -> 0-100, from record.kpis[].score (e.g. "VP Rating")
}

export type SubmissionStatus = "Submitted" | "Submitted with flags" | "Not submitted";

export function deriveSubmissionStatus(inputs: PerfInputs): SubmissionStatus {
  if (!inputs.submittedAt) return "Not submitted";
  return inputs.isFlagged ? "Submitted with flags" : "Submitted";
}

// ─── Output: the auditable breakdown ──────────────────────────────────────

export type KpiStatus =
  | "ok"
  | "missing-excluded"
  | "missing-flagged"
  | "missing-defaulted"
  | "below-cutoff";

export interface KpiBreakdownEntry {
  kpiId: string;
  name: string;
  source: KpiSource;
  weight: number;
  rawValue: number | null;
  normalizedScore: number | null; // 0-100, null only when excluded
  weightedContribution: number; // normalizedScore * weight / 100
  status: KpiStatus;
}

export interface FinalScoreResult {
  finalScore: number | null; // null only if every KPI was excluded
  eligible: boolean; // false if any required KPI is missing or below its cutoff
  submissionStatus: SubmissionStatus;
  breakdown: KpiBreakdownEntry[];
  flags: string[]; // human-readable reasons surfaced to reviewers
  effectiveWeightTotal: number; // sum of weights actually counted (may be < 100 if some excluded)
}

// ─── Step 1: pull the raw value for a KPI's configured source ─────────────

function getRawValue(source: KpiSource, kpi: KpiConfig, inputs: PerfInputs): number | null {
  switch (source) {
    case "rating": {
      const vals = [inputs.personalRating, inputs.professionalRating].filter(
        (v): v is number => v !== null
      );
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    case "attendance":
      return inputs.meetingsTotal > 0 ? inputs.meetingsAttended : null;
    case "deliverables":
      return inputs.deliverablesAssigned > 0 ? inputs.deliverablesAnswered : null;
    case "timeliness": {
      if (!inputs.submittedAt) return null;
      if (!inputs.cycleDeadline) return 100; // no deadline to compare against
      const submitted = new Date(inputs.submittedAt).getTime();
      const deadline = new Date(inputs.cycleDeadline).getTime();
      // Binary on-time/late by default — swap for a decaying scale if you
      // want partial credit for being a little late.
      return submitted <= deadline ? 100 : 0;
    }
    case "manual":
      return inputs.manualScores[kpi.name] ?? null;
  }
}

// ─── Step 2: normalize that raw value to a 0-100 scale ────────────────────
// Ratings and manual scores already arrive on a 0-100 scale (per the schema's
// min/max validators), so normalization here is really just ratio math for
// attendance/deliverables, and a clamp for everything else.

function normalize(source: KpiSource, kpi: KpiConfig, inputs: PerfInputs): number | null {
  const raw = getRawValue(source, kpi, inputs);
  if (raw === null) return null;

  switch (source) {
    case "rating":
    case "timeliness":
    case "manual":
      return Math.max(0, Math.min(100, raw));
    case "attendance":
      return inputs.meetingsTotal > 0
        ? Math.max(0, Math.min(100, (raw / inputs.meetingsTotal) * 100))
        : null;
    case "deliverables":
      return inputs.deliverablesAssigned > 0
        ? Math.max(0, Math.min(100, (raw / inputs.deliverablesAssigned) * 100))
        : null;
  }
}

// ─── Step 3: the full pipeline ─────────────────────────────────────────────

export function calculateFinalScore(
  kpiConfigs: KpiConfig[],
  inputs: PerfInputs
): FinalScoreResult {
  const breakdown: KpiBreakdownEntry[] = [];
  const flags: string[] = [];
  let eligible = true;
  let weightedSum = 0;
  let effectiveWeightTotal = 0;

  // A not-submitted record can itself be treated as "missing" for every
  // KPI — comment out this block if you'd rather score whatever partial
  // data exists (e.g. team-leader-assigned attendance/deliverables) even
  // before the member submits their own ratings.
  const submissionStatus = deriveSubmissionStatus(inputs);
  const treatAllAsMissing = submissionStatus === "Not submitted";

  for (const kpi of kpiConfigs) {
    const kpiId = kpi._id ?? kpi.name;
    let normalized = treatAllAsMissing ? null : normalize(kpi.source, kpi, inputs);
    const rawValue = treatAllAsMissing ? null : getRawValue(kpi.source, kpi, inputs);
    let status: KpiStatus = "ok";

    if (normalized === null) {
      switch (kpi.missingPolicy) {
        case "exclude":
          breakdown.push({
            kpiId,
            name: kpi.name,
            source: kpi.source,
            weight: kpi.weight,
            rawValue,
            normalizedScore: null,
            weightedContribution: 0,
            status: "missing-excluded",
          });
          if (kpi.required) {
            eligible = false;
            flags.push(`${kpi.name} is required but has no data, and is excluded per policy`);
          }
          continue; // does not count toward effectiveWeightTotal

        case "flag":
          status = "missing-flagged";
          flags.push(`${kpi.name} is missing input data`);
          normalized = 0;
          if (kpi.required) eligible = false;
          break;

        case "default":
          status = "missing-defaulted";
          normalized = kpi.defaultValue ?? 0;
          break;
      }
    }

    if (kpi.cutoff != null && normalized < kpi.cutoff) {
      if (status === "ok") status = "below-cutoff";
      flags.push(`${kpi.name} (${normalized.toFixed(1)}%) is below its cutoff of ${kpi.cutoff}%`);
      if (kpi.required) eligible = false;
    }

    const contribution = (normalized * kpi.weight) / 100;
    weightedSum += contribution;
    effectiveWeightTotal += kpi.weight;

    breakdown.push({
      kpiId,
      name: kpi.name,
      source: kpi.source,
      weight: kpi.weight,
      rawValue,
      normalizedScore: Math.round(normalized * 100) / 100,
      weightedContribution: Math.round(contribution * 100) / 100,
      status,
    });
  }

  if (treatAllAsMissing) {
    flags.push("Member has not submitted their ratings for this period");
  } else if (submissionStatus === "Submitted with flags") {
    flags.push("Record is flagged for admin review");
  }

  // Re-scale against the weight actually used, so an excluded KPI doesn't
  // silently drag the score down just because 100% of weight wasn't counted.
  const finalScore =
    effectiveWeightTotal > 0
      ? Math.round((weightedSum / effectiveWeightTotal) * 100 * 100) / 100
      : null;

  return { finalScore, eligible, submissionStatus, breakdown, flags, effectiveWeightTotal };
}

// ─── Config validation (call this when KPI weights are saved) ─────────────

export function validateKpiConfig(kpiConfigs: KpiConfig[]): string[] {
  const errors: string[] = [];
  const totalWeight = kpiConfigs.reduce((sum, k) => sum + k.weight, 0);

  if (Math.round(totalWeight) !== 100) {
    errors.push(`KPI weights must total 100% (currently ${totalWeight}%)`);
  }
  for (const kpi of kpiConfigs) {
    if (!kpi.name.trim()) errors.push("Every KPI needs a name");
    if (!Number.isFinite(kpi.weight) || kpi.weight <= 0) {
      errors.push(`${kpi.name || "Unnamed KPI"} needs a positive weight`);
    }
    if (kpi.cutoff != null && (kpi.cutoff < 0 || kpi.cutoff > 100)) {
      errors.push(`${kpi.name}: cutoff must be between 0 and 100`);
    }
    if (kpi.missingPolicy === "default" && kpi.defaultValue == null) {
      errors.push(`${kpi.name}: missing-data policy "default" needs a defaultValue`);
    }
  }
  return errors;
}