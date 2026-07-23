import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCurrentCycle } from "@/lib/performance"

/**
 * POST /api/performance/notify — a member signals to their team leader that
 * they've completed an assigned deliverable/meeting.
 *
 * This does NOT flip the item's `completed` flag — only a team leader can do
 * that, via PATCH /api/team/records/[userId]. It just timestamps the
 * member's claim (`notifiedAt`) and creates a Notification for the leader to
 * act on.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const itemType = body?.itemType
    const itemId = body?.itemId
    if (itemType !== "deliverable" && itemType !== "meeting") {
      return NextResponse.json(
        { error: "itemType must be 'deliverable' or 'meeting'." },
        { status: 400 }
      )
    }
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId is required." }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User, SubDepartment, Role, PerformanceRecord, Notification } =
      require("@/database")
    await connectDB()

    const cycle = await getCurrentCycle()
    if (!cycle) return NextResponse.json({ error: "No active cycle found." }, { status: 404 })

    const record = await PerformanceRecord.findOne({
      user: session.user.id,
      periodMonth: cycle.periodMonth,
      periodYear: cycle.periodYear,
    })
    if (!record) {
      return NextResponse.json({ error: "No record found for this cycle." }, { status: 404 })
    }

    const list = itemType === "deliverable" ? record.deliverables : record.meetings
    const item = list.id(itemId)
    if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 })
    if (item.completed) {
      return NextResponse.json(
        { error: "This item is already marked complete by your team leader." },
        { status: 400 }
      )
    }

    item.notifiedAt = new Date()
    await record.save()

    const me = await User.findById(session.user.id).select("firstName lastName subDepartment")

    // Resolve who to notify: the sub-department's designated leader first,
    // falling back to any user holding the "Team Leader" (level 2) role in
    // that same sub-department (same convention /api/team/records relies on).
    let recipientId: string | null = null
    if (me?.subDepartment) {
      const subDept = await SubDepartment.findById(me.subDepartment).select("subDeptLeader")
      recipientId = subDept?.subDeptLeader ? subDept.subDeptLeader.toString() : null

      if (!recipientId) {
        const leaderRole = await Role.findOne({ level: 2 }).select("_id")
        if (leaderRole) {
          const leader = await User.findOne({
            subDepartment: me.subDepartment,
            role: leaderRole._id,
          }).select("_id")
          recipientId = leader?._id?.toString() ?? null
        }
      }
    }

    let warning: string | undefined
    if (recipientId) {
      const senderName = `${me?.firstName ?? "A member"} ${me?.lastName ?? ""}`.trim()
      await Notification.create({
        recipient: recipientId,
        sender: session.user.id,
        record: record._id,
        itemType,
        itemId: item._id,
        itemName: item.name,
        periodMonth: cycle.periodMonth,
        periodYear: cycle.periodYear,
        message: `${senderName} marked "${item.name}" as done and is awaiting confirmation.`,
      })
    } else {
      warning = "No team leader is assigned to your sub-department yet, so nobody could be notified."
    }

    return NextResponse.json({ ok: true, notifiedAt: item.notifiedAt, warning })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to notify team leader" },
      { status: 500 }
    )
  }
}
