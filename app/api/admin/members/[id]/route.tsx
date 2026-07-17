/**
 * /api/admin/members/[id]
 *
 * GET    — fetch one user by MongoDB _id
 * PATCH  — update allowed fields (admin only)
 * DELETE — remove user (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Session } from "next-auth";

function adminOnly(session: Session | null) {
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.roleLevel < 3) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// ─── GET /api/admin/members/[id] ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectDB, User } = require("@/database");
    await connectDB();

    const user = await User.findById(params.id)
      .populate("role", "title level")
      .populate("department", "name officeType")
      .populate("subDepartment", "name")
      .lean();

    if (!user) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ member: user });
  } catch (err) {
    console.error("[GET /api/admin/members/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/members/[id] ───────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const forbidden = adminOnly(session);
    if (forbidden) return forbidden;

    const body = await req.json();

    const allowed = ["firstName", "lastName", "email", "birthdate", "idNumber", "role", "department", "subDepartment"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { connectDB, User, SubDepartment } = require("@/database");
    await connectDB();

    const currentUser = await User.findById(params.id).select("department subDepartment").lean();
    if (!currentUser) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const effectiveDepartment = ("department" in update)
      ? (update.department as string | null)
      : (currentUser.department ? currentUser.department.toString() : null);

    if ("subDepartment" in update) {
      const nextSubDept = update.subDepartment as string | null;
      if (!nextSubDept) {
        update.subDepartment = null;
      } else {
        if (!effectiveDepartment) {
          return NextResponse.json(
            { error: "Department is required when assigning a sub-department" },
            { status: 400 }
          );
        }
        const subDeptDoc = await SubDepartment.findOne({
          _id: nextSubDept,
          department: effectiveDepartment,
        }).lean();
        if (!subDeptDoc) {
          return NextResponse.json(
            { error: "Selected sub-department does not belong to the chosen department" },
            { status: 400 }
          );
        }
      }
    }

    // If department changes and subDepartment was not explicitly changed, clear stale assignment.
    if ("department" in update && !("subDepartment" in update)) {
      update.subDepartment = null;
    }

    const updated = await User.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("role", "title level")
      .populate("department", "name officeType")
      .populate("subDepartment", "name")
      .lean();

    if (!updated) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { logAdminActivity } = await import("@/lib/activity-log");
    await logAdminActivity({
      actor: { id: session!.user.id, name: session!.user.name, role: session!.user.role },
      category: "Member Management",
      action: "edit",
      description: `Updated member ${updated.firstName} ${updated.lastName} (${Object.keys(update).join(", ")})`,
      targetType: "User",
      targetId: params.id,
      targetLabel: `${updated.firstName} ${updated.lastName}`,
    });

    return NextResponse.json({ message: "Member updated", member: updated });
  } catch (err: any) {
    console.error("[PATCH /api/admin/members/[id]]", err);
    if (err.code === 11000) {
      return NextResponse.json({ error: "Email or ID number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/members/[id] ──────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const forbidden = adminOnly(session);
    if (forbidden) return forbidden;

    const { connectDB, User } = require("@/database");
    await connectDB();

    const deleted = await User.findByIdAndDelete(params.id).lean();
    if (!deleted) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const { logAdminActivity } = await import("@/lib/activity-log");
    await logAdminActivity({
      actor: { id: session!.user.id, name: session!.user.name, role: session!.user.role },
      category: "Member Management",
      action: "delete",
      description: `Removed member ${deleted.firstName} ${deleted.lastName} (${deleted.email})`,
      targetType: "User",
      targetId: params.id,
      targetLabel: `${deleted.firstName} ${deleted.lastName}`,
    });

    return NextResponse.json({ message: "Member removed" });
  } catch (err) {
    console.error("[DELETE /api/admin/members/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}