/**
 * /api/admin/stats
 *
 * GET — returns aggregated numbers for the admin dashboard metric cards:
 *   - totalMembers
 *   - avgKpiAchievement  (avg quantitativeRating across the current period)
 *   - pendingSubmissions (users who have NOT submitted a record this period)
 *   - deptStatus         (per-department submission counts)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectDB, User, PerformanceRecord, Department } = require("@/database");
    await connectDB();

    // Current period
    const now = new Date();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const currentMonth = months[now.getMonth()];
    const currentYear = now.getFullYear();

    // Total active members
    const totalMembers: number = await User.countDocuments();

    // Records submitted this period
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

    // Average KPI (quantitativeRating, ignoring nulls)
    const ratings = periodRecords
      .map((r: any) => r.quantitativeRating)
      .filter((v: number | null) => v !== null) as number[];

    const avgKpiAchievement =
      ratings.length > 0
        ? Math.round(ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length)
        : null;

    // Pending = members who haven't submitted yet this period
    const submittedUserIds = new Set(
      periodRecords.map((r: any) => r.user?._id?.toString())
    );
    const allUserIds: string[] = (await User.find().select("_id").lean()).map(
      (u: any) => u._id.toString()
    );
    const pendingSubmissions = allUserIds.filter((id) => !submittedUserIds.has(id)).length;

    // Per-department submission status
    const departments = await Department.find().lean();
    const deptStatus = await Promise.all(
      departments.map(async (dept: any) => {
        const deptMemberCount: number = await User.countDocuments({ department: dept._id });
        const submittedInDept = periodRecords.filter(
          (r: any) => r.user?.department?._id?.toString() === dept._id.toString()
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