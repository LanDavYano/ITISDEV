import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const CSV_TEMPLATE = [
  "firstName,lastName,email,idNumber,birthdate,department,subDepartment,role,password",
  "Juan,Dela Cruz,juan.delacruz@aiesec.ph,12000010,2003-01-15,Talent Management,Performance Management,Member,",
  "Maria,Santos,maria.santos@aiesec.ph,12000011,2004-06-20,Marketing,Brand Marketing,Member,",
].join("\r\n")

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.roleLevel ?? 1) < 3) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="aiesec-member-import-template.csv"',
    },
  })
}
