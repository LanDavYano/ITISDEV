import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, PasswordResetToken } from "@/database"
import { sendPasswordResetOtp } from "@/lib/email"

const AIESEC_EMAIL_RE = /^[^\s@]+@aiesec\.ph$/i

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !AIESEC_EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid @aiesec.ph email address." },
        { status: 400 }
      )
    }

    await connectDB()

    const normalised = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalised })
    if (!user) {
      // Return 200 regardless to avoid account enumeration
      return NextResponse.json({ message: "If that account exists, a code was sent." })
    }

    // Invalidate any existing OTP tokens for this email
    await PasswordResetToken.deleteMany({ email: normalised, type: "otp" })

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await PasswordResetToken.create({ email: normalised, token: otp, type: "otp", expiresAt })

    try {
      await sendPasswordResetOtp(normalised, otp)
    } catch (emailErr) {
      console.error("[send-otp] email delivery failed:", emailErr)
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      )
    }

    const body: Record<string, string> = { message: "Verification code sent." }
    // Expose OTP in dev so the UI can display it to testers
    if (process.env.NODE_ENV !== "production") {
      body.devOtp = otp
    }

    return NextResponse.json(body)
  } catch (err) {
    console.error("[send-otp]", err)
    return NextResponse.json(
      { error: "Could not send code. Please try again." },
      { status: 500 }
    )
  }
}
