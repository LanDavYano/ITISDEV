/**
 * /api/admin/sub-departments/[id]
 *
 * PATCH  — update sub-department fields (admin only). Parent department is
 *          immutable via edit — moving to a different department is out of scope.
 * DELETE — remove a sub-department, reassigning its members (admin only)
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
    const allowed = ["name", "description", "memberCapacity", "subDeptLeader"]
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    if ("memberCapacity" in update) {
      const raw = update.memberCapacity
      update.memberCapacity = raw === "" || raw == null ? null : Number(raw)
    }
    if ("subDeptLeader" in update && !update.subDeptLeader) {
      update.subDeptLeader = null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, SubDepartment } = require("@/database")
    await connectDB()

    const updated = await SubDepartment.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("department", "name")
      .populate("subDeptLeader", "firstName lastName")
      .lean()

    if (!updated) return NextResponse.json({ error: "Sub-department not found" }, { status: 404 })

    return NextResponse.json({ message: "Sub-department updated", subDepartment: updated })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "A sub-department with this name already exists in the department" },
        { status: 409 }
      )
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
    const { connectDB, SubDepartment, User } = require("@/database")
    await connectDB()

    const sub = await SubDepartment.findById(params.id).lean()
    if (!sub) return NextResponse.json({ error: "Sub-department not found" }, { status: 404 })

    const res = await User.updateMany(
      { subDepartment: params.id },
      { $set: { subDepartment: null } }
    )

    await SubDepartment.findByIdAndDelete(params.id)

    return NextResponse.json({
      message: "Sub-department removed",
      membersReassigned: res.modifiedCount ?? 0,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
