/**
 * /api/admin/sub-departments
 *
 * GET  — list sub-departments (optionally filtered by ?departmentId=), enriched
 *        with member counts and populated department/leader for display
 * POST — create a new sub-department (admin only, roleLevel >= 3)
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get("departmentId")

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, SubDepartment, User } = require("@/database")
    await connectDB()

    const query = departmentId ? { department: departmentId } : {}
    const subDepartments = await SubDepartment.find(query)
      .sort({ name: 1 })
      .populate("department", "name")
      .populate("subDeptLeader", "firstName lastName")
      .lean()

    const enriched = await Promise.all(
      subDepartments.map(async (sub: any) => {
        const memberCount = await User.countDocuments({ subDepartment: sub._id })
        return { ...sub, memberCount }
      })
    )

    return NextResponse.json({ subDepartments: enriched })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if ((session.user as any).roleLevel < 3) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { name, department, description, memberCapacity, subDeptLeader } = body

    if (!name || !department) {
      return NextResponse.json({ error: "Name and department are required" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, SubDepartment, Department } = require("@/database")
    await connectDB()

    const parentDept = await Department.findById(department).lean()
    if (!parentDept) {
      return NextResponse.json({ error: "Selected department does not exist" }, { status: 400 })
    }

    const { User, Role } = require("@/database")

    const created = await SubDepartment.create({
      name,
      department,
      description: description ?? "",
      memberCapacity: memberCapacity === "" || memberCapacity == null ? null : Number(memberCapacity),
      subDeptLeader: null,
    })

    const leaderRole = await Role.findOne({ level: 2 }).select("_id").lean()
    const resolvedLeader = leaderRole
      ? await User.findOne({ role: leaderRole._id, subDepartment: created._id, department })
          .select("_id")
          .lean()
      : null

    const updated = await SubDepartment.findByIdAndUpdate(
      created._id,
      { $set: { subDeptLeader: resolvedLeader?._id ?? null } },
      { new: true, runValidators: true }
    ).lean()

    return NextResponse.json(
      {
        message: "Sub-department created",
        id: created._id.toString(),
        subDepartment: updated,
      },
      { status: 201 }
    )
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
