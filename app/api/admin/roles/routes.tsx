/**
 * /api/admin/roles   — GET all roles
 * /api/admin/departments — GET all departments
 *
 * These are used to populate dropdowns in the Add Member modal.
 */

// ── roles/route.ts ──────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { connectDB, Role } = require("@/database");
    await connectDB();
    const roles = await Role.find().sort({ level: 1 }).lean();
    return NextResponse.json({ roles });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}