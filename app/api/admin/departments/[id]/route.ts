/**
 * /api/admin/departments/[id]
 *
 * PATCH  — update department fields (admin only)
 * DELETE — remove a department, reassigning its members and cascading its
 *          sub-departments (admin only)
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"

function adminOnly(session: Session | null) {
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if ((session.user as any).roleLevel < 3) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const forbidden = adminOnly(session)
    if (forbidden) return forbidden

    const body = await req.json()
    const allowed = ["name", "officeType", "description", "memberCapacity", "deptLeader"]
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if ("memberCapacity" in update) {
      const raw = update.memberCapacity
      update.memberCapacity = raw === "" || raw == null ? null : Number(raw)
    }
    if ("deptLeader" in update && !update.deptLeader) {
      update.deptLeader = null
    }

    if (!("deptLeader" in body)) {
      const { Role, User } = require("@/database")
      const leaderRole = await Role.findOne({ level: 3 }).select("_id").lean()
      const resolvedLeader = leaderRole
        ? await User.findOne({ role: leaderRole._id, department: params.id })
            .select("_id")
            .lean()
        : null
      update.deptLeader = resolvedLeader?._id ?? null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Department } = require("@/database")
    await connectDB()

    const updated = await Department.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("deptLeader", "firstName lastName")
      .lean()

    if (!updated) return NextResponse.json({ error: "Department not found" }, { status: 404 })

    const { logAdminActivity } = await import("@/lib/activity-log")
    await logAdminActivity({
      actor: { id: session!.user.id, name: session!.user.name, role: session!.user.role },
      category: "Department Management",
      action: "edit",
      description: `Updated department “${(updated as any).name}”`,
      targetType: "Department",
      targetId: params.id,
      targetLabel: (updated as any).name,
    })

    return NextResponse.json({ message: "Department updated", department: updated })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const forbidden = adminOnly(session)
    if (forbidden) return forbidden

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Department, SubDepartment, User } = require("@/database")
    await connectDB()

    const dept = await Department.findById(params.id).lean()
    if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 })

    const subDepartments = await SubDepartment.find({ department: params.id }).select("_id").lean()
    const subDepartmentIds = subDepartments.map((s: any) => s._id)

    const affectedUserIds = await User.find({
      $or: [{ department: params.id }, { subDepartment: { $in: subDepartmentIds } }],
    })
      .select("_id")
      .lean()
      .then((docs: any[]) => docs.map((d) => d._id.toString()))

    if (subDepartmentIds.length > 0) {
      await User.updateMany(
        { subDepartment: { $in: subDepartmentIds } },
        { $set: { subDepartment: null } }
      )
      await SubDepartment.deleteMany({ department: params.id })
    }

    await User.updateMany(
      { department: params.id },
      { $set: { department: null, subDepartment: null } }
    )

    await Department.findByIdAndDelete(params.id)

    const { logAdminActivity } = await import("@/lib/activity-log")
    await logAdminActivity({
      actor: { id: session!.user.id, name: session!.user.name, role: session!.user.role },
      category: "Department Management",
      action: "delete",
      description: `Removed department “${(dept as any).name}” (${affectedUserIds.length} member(s) reassigned, ${subDepartmentIds.length} sub-department(s) removed)`,
      targetType: "Department",
      targetId: params.id,
      targetLabel: (dept as any).name,
    })

    return NextResponse.json({
      message: "Department removed",
      membersReassigned: affectedUserIds.length,
      subDepartmentsRemoved: subDepartmentIds.length,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
