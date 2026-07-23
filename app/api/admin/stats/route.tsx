/**
 * /api/admin/stats
 *
 * GET — returns aggregated numbers for the admin dashboard metric cards:
 *   - totalMembers
 *   - avgKpiAchievement  (avg computed finalScore across the current period)
 *   - pendingSubmissions (users whose record has no submittedAt this period)
 *   - deptStatus         (per-department submission counts)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateFinalScore, type PerfInputs } from "@/lib/scoring";
import { getCurrentCycle } from "@/lib/performance";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectDB, User, PerformanceRecord, Department } = require("@/database");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const KpiConfig = require("@/database/KpiConfig");
    await connectDB();

    // Current period — prefer the actual EvaluationCycle if one exists,
    // same source of truth the other two performance routes use, rather
    // than deriving it from today's date (those can disagree near a
    // period boundary).
    const cycle = await getCurrentCycle();
    const now = new Date();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const currentMonth = cycle?.periodMonth ?? months[now.getMonth()];
    const currentYear = cycle?.periodYear ?? now.getFullYear();

    // Total active members
    const totalMembers: number = await User.countDocuments();

    // KPI config for this period (same shared config the score routes use)
    const configDoc = await KpiConfig.findOne({ periodMonth: currentMonth, periodYear: currentYear }).lean();
    const kpiConfigs = configDoc?.kpis?.length ? configDoc.kpis : KpiConfig.DEFAULT_KPI_CONFIG;

    // Records for this period
    const periodRecords = await PerformanceRecord.find({
      periodMonth: currentMonth,
      periodYear: currentYear,
    })
      .populate({
        path: "user",
        populate: { path: "department", select: "name" },
        select: "department",
      })
      .lean();

    // Compute each record's real final score using the same pipeline as
    // /api/admin/performance, instead of averaging a raw field directly.
    const finalScores: number[] = [];
    for (const r of periodRecords as any[]) {
      const manualScores: Record<string, number> = {};
      for (const k of r.kpis ?? []) {
        if (k?.name) manualScores[k.name] = k.score ?? 0;
      }
      const inputs: PerfInputs = {
        personalRating: r.personalRating ?? null,
        professionalRating: r.professionalRating ?? null,
        meetingsTotal: r.meetingsTotal ?? 0,
        meetingsAttended: r.meetingsAttended ?? 0,
        deliverablesAssigned: r.deliverablesAssigned ?? 0,
        deliverablesAnswered: r.deliverablesAnswered ?? 0,
        submittedAt: r.submittedAt ?? null,
        cycleDeadline: cycle?.submissionDeadline ?? null,
        isFlagged: r.isFlagged ?? false,
        manualScores,
      };
      const result = calculateFinalScore(kpiConfigs, inputs);
      if (result.finalScore !== null) finalScores.push(result.finalScore);
    }

    const avgKpiAchievement =
      finalScores.length > 0
        ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length)
        : null;

    // "Submitted" means the member has actually submitted their ratings —
    // a record can exist beforehand (team leader assigns counts first)
    // without submittedAt being set, so record-existence alone isn't enough.
    const submittedUserIds = new Set(
      (periodRecords as any[])
        .filter((r) => r.submittedAt != null)
        .map((r) => r.user?._id?.toString())
    );
    const allUserIds: string[] = (await User.find().select("_id").lean()).map(
      (u: any) => u._id.toString()
    );
    const pendingSubmissions = allUserIds.filter((id) => !submittedUserIds.has(id)).length;

    // Per-department submission status (same submittedAt-based definition)
    const departments = await Department.find().lean();
    const deptStatus = await Promise.all(
      departments.map(async (dept: any) => {
        const deptMemberCount: number = await User.countDocuments({ department: dept._id });
        const submittedInDept = (periodRecords as any[]).filter(
          (r) => r.submittedAt != null && r.user?.department?._id?.toString() === dept._id.toString()
        ).length;
        const ratio = `${submittedInDept}/${deptMemberCount}`;
        const pill =
          submittedInDept === deptMemberCount
            ? "success"
            : submittedInDept / Math.max(deptMemberCount, 1) >= 0.6
            ? "info"
            : "warning";
        const pillLabel =
          pill === "success" ? "Complete" : pill === "info" ? "On Track" : "Needs Action";

        return { name: dept.name, ratio, pill, pillLabel };
      })
    );

    return NextResponse.json({
      totalMembers,
      avgKpiAchievement,
      pendingSubmissions,
      currentPeriod: `${currentMonth} ${currentYear}`,
      deptStatus,
    });
  } catch (err) {
    console.error("[GET /api/admin/stats]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}