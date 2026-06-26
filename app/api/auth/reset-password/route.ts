import { NextRequest, NextResponse } from 'next/server'

const PW_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (!PW_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must be 8+ characters with an uppercase letter, number, and symbol.' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User } = require('@/database')
    await connectDB()

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+resetPasswordOtp +password')

    if (
      !user ||
      !user.resetPasswordOtp ||
      !user.resetPasswordExpires ||
      user.resetPasswordOtp !== otp.trim() ||
      user.resetPasswordExpires < new Date()
    ) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
    }

    user.password = newPassword
    user.resetPasswordOtp = null
    user.resetPasswordExpires = null
    await user.save()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
