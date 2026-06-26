import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, PasswordResetToken } from "@/database"

const PW_RE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(req: NextRequest) {
  try {
    const { email, resetToken, newPassword, confirmPassword } = await req.json()

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 })
    }
    if (!PW_RE.test(newPassword)) {
      return NextResponse.json(
        { error: "Password must be 8+ chars with uppercase, number, and symbol." },
        { status: 400 }
      )
    }

    await connectDB()

    const normalised = email.toLowerCase().trim()
    const record = await PasswordResetToken.findOne({
      email: normalised,
      token: resetToken,
      type: "reset",
    })

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired reset session. Please start over." },
        { status: 400 }
      )
    }

    if (record.expiresAt < new Date()) {
      await record.deleteOne()
      return NextResponse.json(
        { error: "Reset session expired. Please start over." },
        { status: 400 }
      )
    }

    // Update password — the User pre-save hook will hash it
    const user = await User.findOne({ email: normalised })
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    user.password = newPassword
    await user.save()

    // Clean up the reset token
    await record.deleteOne()

    return NextResponse.json({ message: "Password updated successfully." })
  } catch (err) {
    console.error("[reset-password]", err)
    return NextResponse.json(
      { error: "Could not reset password. Please try again." },
      { status: 500 }
    )
  }
}
