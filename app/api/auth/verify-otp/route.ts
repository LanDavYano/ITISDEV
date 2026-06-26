import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User } = require('@/database')
    await connectDB()

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+resetPasswordOtp')

    if (
      !user ||
      !user.resetPasswordOtp ||
      !user.resetPasswordExpires ||
      user.resetPasswordOtp !== otp.trim() ||
      user.resetPasswordExpires < new Date()
    ) {
      return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify-otp]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
