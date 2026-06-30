import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// APMP-60: Adjust deadline — APMP-61: reject past dates — APMP-63: re-enables editing if extended
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { submissionDeadline } = await req.json()
    const newDeadline = new Date(submissionDeadline)

    // APMP-61: Cannot set a past date
    if (newDeadline <= new Date()) {
      return NextResponse.json({ error: "Deadline must be a future date" }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB } = require("@/database/db")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const EvaluationCycle = require("@/database/EvaluationCycle")

    await connectDB()
    const cycle = await EvaluationCycle.findByIdAndUpdate(
      params.id,
      { submissionDeadline: newDeadline },
      { new: true }
    )

    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

    return NextResponse.json({ ...cycle.toObject(), isOpen: true })
  } catch {
    return NextResponse.json({ error: "Failed to update deadline" }, { status: 500 })
  }
}
