/**
 * /api/admin/members
 *
 * GET  — list all users (with role, department, subDepartment populated)
 * POST — create a new user (admin only, roleLevel >= 3)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── GET /api/admin/members ──────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectDB, User } = require("@/database");
    await connectDB();

    const users = await User.find()
      .populate("role", "title level")
      .populate("department", "name officeType")
      .populate("subDepartment", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ members: users });
  } catch (err) {
    console.error("[GET /api/admin/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/members ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.roleLevel < 3) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      password,
      birthdate,
      idNumber,
      role,
      department,
      subDepartment,
    } = body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !birthdate ||
      !idNumber ||
      !role ||
      !department
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { connectDB, User, SubDepartment } = require("@/database");
    await connectDB();

    let resolvedSubDepartment: string | null = null;
    if (subDepartment) {
      const subDeptDoc = await SubDepartment.findOne({ _id: subDepartment, department }).lean();
      if (!subDeptDoc) {
        return NextResponse.json(
          { error: "Selected sub-department does not belong to the chosen department" },
          { status: 400 }
        );
      }
      resolvedSubDepartment = subDepartment;
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      birthdate: new Date(birthdate),
      idNumber,
      role,
      department,
      subDepartment: resolvedSubDepartment,
    });

    const { logAdminActivity } = await import("@/lib/activity-log");
    await logAdminActivity({
      actor: { id: session.user.id, name: session.user.name, role: session.user.role },
      category: "Member Management",
      action: "create",
      description: `Added member ${firstName} ${lastName} (${email})`,
      targetType: "User",
      targetId: newUser._id.toString(),
      targetLabel: `${firstName} ${lastName}`,
    });

    return NextResponse.json(
      { message: "Member created", id: newUser._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/members]", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "Email or ID number already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}