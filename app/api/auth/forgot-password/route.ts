import { NextRequest, NextResponse } from 'next/server'
import { sendPasswordResetOtp } from '@/lib/email'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { connectDB, User } = require('@/database')
    await connectDB()

    const user = await User.findOne({ email: normalizedEmail })

    // Always return success — never reveal whether the email exists
    if (!user) return NextResponse.json({ success: true })

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    user.resetPasswordOtp = otp
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000)
    await user.save()

    await sendPasswordResetOtp(normalizedEmail, otp)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
