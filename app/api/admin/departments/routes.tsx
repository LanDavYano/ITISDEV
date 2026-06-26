/**
 * /api/admin/departments — GET all departments
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { connectDB, Department } = require("@/database");
    await connectDB();
    const departments = await Department.find().sort({ name: 1 }).lean();
    return NextResponse.json({ departments });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}