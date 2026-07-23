import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/** PATCH /api/notifications/[id] — mark one of the caller's own notifications read. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, Notification } = require("@/database")
    await connectDB()

    const notification = await Notification.findById(params.id)
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }
    if (notification.recipient.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    notification.read = true
    notification.readAt = new Date()
    await notification.save()

    return NextResponse.json(notification)
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}
