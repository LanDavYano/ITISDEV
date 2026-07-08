/**
 * /api/admin/departments
 *
 * GET  — list all departments, enriched with member/sub-department counts
 * POST — create a new department (admin only, roleLevel >= 3)
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Department, User, SubDepartment } = require("@/database")
    await connectDB()

    const departments = await Department.find()
      .sort({ name: 1 })
      .populate("deptLeader", "firstName lastName")
      .lean()

    const enriched = await Promise.all(
      departments.map(async (dept: any) => {
        const [memberCount, subDepartmentCount] = await Promise.all([
          User.countDocuments({ department: dept._id }),
          SubDepartment.countDocuments({ department: dept._id }),
        ])
        return { ...dept, memberCount, subDepartmentCount }
      })
    )

    return NextResponse.json({ departments: enriched })
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
    const { name, officeType, description, memberCapacity, deptLeader } = body

    if (!name || !officeType) {
      return NextResponse.json({ error: "Name and office type are required" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Department } = require("@/database")
    await connectDB()

    const created = await Department.create({
      name,
      officeType,
      description: description ?? "",
      memberCapacity: memberCapacity === "" || memberCapacity == null ? null : Number(memberCapacity),
      deptLeader: deptLeader || null,
    })

    return NextResponse.json(
      { message: "Department created", id: created._id.toString() },
      { status: 201 }
    )
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
