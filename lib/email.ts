import nodemailer from 'nodemailer'

export async function sendPasswordResetOtp(to: string, otp: string) {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[DEV] Password reset OTP for ${to}: ${otp}`)
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  await transporter.sendMail({
    from: `"AIESEC DLSU" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your password reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1d4ed8;">AIESEC DLSU — Password Reset</h2>
        <p>Your verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;margin:16px 0;">${otp}</div>
        <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
        <p style="color:#9ca3af;font-size:12px;">AIESEC DLSU Management System</p>
      </div>
    `,
  })
}
