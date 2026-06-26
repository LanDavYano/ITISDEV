import { NextRequest, NextResponse } from "next/server"
import { connectDB, PasswordResetToken } from "@/database"
import { randomBytes } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      )
    }

    await connectDB()

    const normalised = email.toLowerCase().trim()
    const record = await PasswordResetToken.findOne({
      email: normalised,
      type: "otp",
    })

    if (!record || record.token !== String(otp).trim()) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please try again." },
        { status: 400 }
      )
    }

    if (record.expiresAt < new Date()) {
      await record.deleteOne()
      return NextResponse.json(
        { error: "Code has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // OTP is valid — delete it and issue a short-lived reset token
    await record.deleteOne()

    const resetToken = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await PasswordResetToken.create({
      email: normalised,
      token: resetToken,
      type: "reset",
      expiresAt,
    })

    return NextResponse.json({ resetToken })
  } catch (err) {
    console.error("[verify-otp]", err)
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    )
  }
}
