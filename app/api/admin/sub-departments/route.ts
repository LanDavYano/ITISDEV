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
    const { connectDB, SubDepartment } = require("@/database")
    await connectDB()

    const query = departmentId ? { department: departmentId } : {}
    const subDepartments = await SubDepartment.find(query)
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({ subDepartments })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
