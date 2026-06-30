import nodemailer from 'nodemailer'

const EMAIL_HTML = (otp: string) => `
  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
    <h2 style="color:#1d4ed8;">AIESEC DLSU — Password Reset</h2>
    <p>Your verification code is:</p>
    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;margin:16px 0;">${otp}</div>
    <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
    <p style="color:#9ca3af;font-size:12px;">AIESEC DLSU Management System</p>
  </div>
`

export async function sendPasswordResetOtp(to: string, otp: string) {
  const hasSmtpConfig =
    process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS

  let transporter: nodemailer.Transporter
  let fromAddress: string
  let isEthereal = false

  if (hasSmtpConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT ?? 587),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
    fromAddress = `"AIESEC DLSU" <${process.env.EMAIL_USER}>`
  } else {
    // Dev fallback: Ethereal Email captures the message without a real inbox.
    // The preview URL is logged so you can inspect the email in your browser.
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
    fromAddress = `"AIESEC DLSU" <${testAccount.user}>`
    isEthereal = true
  }

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Your password reset code',
    html: EMAIL_HTML(otp),
  })

  if (isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info)
    console.log(`[DEV] Ethereal email preview: ${previewUrl}`)
    console.log(`[DEV] Password reset OTP for ${to}: ${otp}`)
  }
}
