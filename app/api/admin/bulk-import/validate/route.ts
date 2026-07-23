import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface ImportRow {
  firstName: string
  lastName: string
  email: string
  idNumber: string
  birthdate: string
  department: string
  subDepartment: string
  role: string
  password: string
}

export interface ValidatedRow extends ImportRow {
  rowIndex: number
  errors: string[]
  valid: boolean
}

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@aiesec\.ph$/i

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.roleLevel ?? 1) < 3) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { rows?: ImportRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rows: ImportRow[] = body.rows ?? []
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 })
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

    // Lookup maps (lowercased for case-insensitive matching)
    const roleByTitle = new Map<string, any>(allRoles.map((r: any) => [r.title.toLowerCase(), r]))
    const deptByName  = new Map<string, any>(allDepts.map((d: any) => [d.name.toLowerCase(), d]))
    // key: "<deptObjectId>:<subDeptName lowercased>"
    const subDeptByKey = new Map<string, any>(
      allSubDepts.map((s: any) => [`${s.department}:${s.name.toLowerCase()}`, s])
    )

    // Detect in-file duplicates (both rows get flagged)
    const seenEmails = new Map<string, number>() // email -> first rowIndex
    const seenIds    = new Map<string, number>()
    const dupEmails  = new Set<number>()
    const dupIds     = new Set<number>()

    for (let i = 0; i < rows.length; i++) {
      const email = (rows[i].email ?? "").toLowerCase().trim()
      const idNum = (rows[i].idNumber ?? "").trim()
      if (email) {
        if (seenEmails.has(email)) { dupEmails.add(i); dupEmails.add(seenEmails.get(email)!) }
        else seenEmails.set(email, i)
      }
      if (idNum) {
        if (seenIds.has(idNum)) { dupIds.add(i); dupIds.add(seenIds.get(idNum)!) }
        else seenIds.set(idNum, i)
      }
    }

    // Batch DB lookups for conflicts
    const allEmails = [...seenEmails.keys()].filter(Boolean)
    const allIdNums = [...seenIds.keys()].filter(Boolean)
    const [existingEmails, existingIdNums] = await Promise.all([
      allEmails.length ? User.find({ email: { $in: allEmails } }).select("email").lean() : [],
      allIdNums.length ? User.find({ idNumber: { $in: allIdNums } }).select("idNumber").lean() : [],
    ])
    const dbEmails = new Set<string>(existingEmails.map((u: any) => u.email.toLowerCase()))
    const dbIdNums = new Set<string>(existingIdNums.map((u: any) => u.idNumber))

    // Validate each row
    const validatedRows: ValidatedRow[] = rows.map((row, i) => {
      const errors: string[] = []

      const firstName  = (row.firstName  ?? "").trim()
      const lastName   = (row.lastName   ?? "").trim()
      const email      = (row.email      ?? "").toLowerCase().trim()
      const idNum      = (row.idNumber   ?? "").trim()
      const birthdate  = (row.birthdate  ?? "").trim()
      const deptName   = (row.department ?? "").trim()
      const subDName   = (row.subDepartment ?? "").trim()
      const roleName   = (row.role       ?? "").trim()

      if (!firstName)  errors.push("First name is required")
      if (!lastName)   errors.push("Last name is required")

      if (!email) {
        errors.push("Email is required")
      } else if (!EMAIL_RE.test(email)) {
        errors.push("Email must be an @aiesec.ph address")
      } else if (dbEmails.has(email)) {
        errors.push("Email already exists in the database")
      } else if (dupEmails.has(i)) {
        errors.push("Duplicate email within this file")
      }

      if (idNum) {
        if (dbIdNums.has(idNum))  errors.push("ID number already exists in the database")
        else if (dupIds.has(i))   errors.push("Duplicate ID number within this file")
      }

      if (birthdate && isNaN(Date.parse(birthdate))) {
        errors.push("Birthdate must be a valid date (YYYY-MM-DD)")
      }

      // Department
      const deptDoc = deptName ? deptByName.get(deptName.toLowerCase()) : null
      if (!deptName) {
        errors.push("Department is required")
      } else if (!deptDoc) {
        errors.push(`Department "${deptName}" not found`)
      }

      // Sub-department
      if (deptDoc && subDName) {
        const key = `${deptDoc._id}:${subDName.toLowerCase()}`
        if (!subDeptByKey.has(key)) {
          errors.push(`Sub-department "${subDName}" not found under ${deptName}`)
        }
      }

      // Role
      if (!roleName) {
        errors.push("Role is required")
      } else if (!roleByTitle.has(roleName.toLowerCase())) {
        errors.push(`Role "${roleName}" not found — must be Member, Team Leader of Sub Department, or Leader of Department`)
      }

      return {
        ...row,
        email,
        idNumber: idNum,
        rowIndex: i,
        errors,
        valid: errors.length === 0,
      }
    })

    const validCount = validatedRows.filter(r => r.valid).length
    const errorCount = validatedRows.filter(r => !r.valid).length

    return NextResponse.json({ rows: validatedRows, validCount, errorCount })
  } catch (err) {
    console.error("[bulk-import/validate]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
