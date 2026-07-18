import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const DEFAULT_PASSWORD = "Password123!"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.roleLevel ?? 1) < 3) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { rows?: any[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Only process rows that passed validation
  const rows = (body.rows ?? []).filter((r: any) => r.valid === true)
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows to import" }, { status: 400 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Role, Department, SubDepartment, User } = require("@/database")
    await connectDB()

    const [allRoles, allDepts, allSubDepts] = await Promise.all([
      Role.find().lean(),
      Department.find().lean(),
      SubDepartment.find().lean(),
    ])

    const roleByTitle  = new Map<string, any>(allRoles.map((r: any) => [r.title.toLowerCase(), r]))
    const deptByName   = new Map<string, any>(allDepts.map((d: any) => [d.name.toLowerCase(), d]))
    const subDeptByKey = new Map<string, any>(
      allSubDepts.map((s: any) => [`${s.department}:${s.name.toLowerCase()}`, s])
    )

    let created = 0
    const failed: { row: number; email: string; error: string }[] = []

    for (const row of rows) {
      try {
        const deptDoc    = deptByName.get((row.department ?? "").toLowerCase())
        const subDeptDoc = deptDoc
          ? subDeptByKey.get(`${deptDoc._id}:${(row.subDepartment ?? "").toLowerCase()}`)
          : null
        const roleDoc    = roleByTitle.get((row.role ?? "").toLowerCase())

        await User.create({
          firstName:     row.firstName.trim(),
          lastName:      row.lastName.trim(),
          email:         row.email.toLowerCase().trim(),
          password:      row.password?.trim() || DEFAULT_PASSWORD,
          idNumber:      row.idNumber?.trim() || undefined,
          birthdate:     row.birthdate ? new Date(row.birthdate) : undefined,
          role:          roleDoc?._id   ?? null,
          department:    deptDoc?._id   ?? null,
          subDepartment: subDeptDoc?._id ?? null,
          userType:      "member",
        })
        created++
      } catch (err: any) {
        failed.push({
          row:   row.rowIndex,
          email: row.email,
          error: err?.message ?? "Unknown error",
        })
      }
    }

    return NextResponse.json({ created, failed, total: rows.length })
  } catch (err) {
    console.error("[bulk-import/confirm]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
