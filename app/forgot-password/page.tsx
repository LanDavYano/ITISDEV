"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react"

type Step = 1 | 2 | 3 | 4

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Email", "Verify", "New password"]
  return (
    <div className="flex items-center justify-center mb-6">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done = step > n
        const active = step === n
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${active || done ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`h-px w-10 sm:w-14 mx-2 mb-5 ${step > n ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PwCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${met ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${met ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
      {label}
    </span>
  )
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>(1)

  const [email, setEmail] = useState("")
  const [devOtp, setDevOtp] = useState("")
  const [step1Error, setStep1Error] = useState("")
  const [step1Loading, setStep1Loading] = useState(false)

  const [otp, setOtp] = useState("")
  const [otpSeconds, setOtpSeconds] = useState(600)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [resetToken, setResetToken] = useState("")
  const [step2Error, setStep2Error] = useState("")
  const [step2Loading, setStep2Loading] = useState(false)

  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [step3Error, setStep3Error] = useState("")
  const [step3Loading, setStep3Loading] = useState(false)

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setOtpSeconds(600)
    timerRef.current = setInterval(() => {
      setOtpSeconds((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const timerLabel = otpSeconds > 0
    ? `${String(Math.floor(otpSeconds / 60)).padStart(2, "0")}:${String(otpSeconds % 60).padStart(2, "0")}`
    : "Expired"

  const pwChecks = {
    len: newPw.length >= 8,
    upper: /[A-Z]/.test(newPw),
    num: /[0-9]/.test(newPw),
    sym: /[^A-Za-z0-9]/.test(newPw),
  }
  const pwValid = Object.values(pwChecks).every(Boolean)

  const sendOtp = async () => {
    setStep1Error("")
    setStep1Loading(true)
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setStep1Error(data.error ?? "Could not send code."); return }
      if (data.devOtp) setDevOtp(data.devOtp)
      setStep(2)
      startTimer()
    } catch {
      setStep1Error("Network error. Please try again.")
    } finally {
      setStep1Loading(false)
    }
  }

  const resendOtp = async () => {
    setStep2Error("")
    setOtp("")
    const res = await fetch("/api/auth/forgot-password/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null)
    if (res) {
      const data = await res.json()
      if (data.devOtp) setDevOtp(data.devOtp)
    }
    startTimer()
  }

  const verifyOtp = async () => {
    setStep2Error("")
    setStep2Loading(true)
    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) { setStep2Error(data.error ?? "Invalid code."); return }
      setResetToken(data.resetToken)
      clearInterval(timerRef.current!)
      setStep(3)
    } catch {
      setStep2Error("Network error. Please try again.")
    } finally {
      setStep2Loading(false)
    }
  }

  const submitNewPw = async () => {
    setStep3Error("")
    if (!pwValid) { setStep3Error("Password must meet all requirements."); return }
    if (newPw !== confirmPw) { setStep3Error("Passwords do not match."); return }
    setStep3Loading(true)
    try {
      const res = await fetch("/api/auth/forgot-password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken, newPassword: newPw, confirmPassword: confirmPw }),
      })
      const data = await res.json()
      if (!res.ok) { setStep3Error(data.error ?? "Could not reset password."); return }
      setStep(4)
    } catch {
      setStep3Error("Network error. Please try again.")
    } finally {
      setStep3Loading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-md p-7 text-gray-900 dark:text-white">

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        {step < 4 && <StepIndicator step={step} />}

        {/* Step 1 — Email */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold">Reset your password</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter your registered AIESEC email.</p>
            </div>

            {step1Error && (
              <p className="text-sm text-red-600 dark:text-red-400">{step1Error}</p>
            )}

            <div>
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                placeholder="you@aiesec.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                className="mt-1.5"
              />
            </div>

            <Button onClick={sendOtp} disabled={step1Loading || !email} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {step1Loading ? "Sending…" : "Send verification code"}
            </Button>
          </div>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold">Enter verification code</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sent to <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>
              </p>
            </div>

            <p className={`text-sm font-medium ${otpSeconds === 0 ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
              Expires in <span className="tabular-nums">{timerLabel}</span>
            </p>

            {devOtp && (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300">
                Dev mode — OTP: <strong className="tracking-widest">{devOtp}</strong>
              </div>
            )}

            {step2Error && <p className="text-sm text-red-600 dark:text-red-400">{step2Error}</p>}

            <div>
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                className="mt-1.5 text-center tracking-[0.4em] text-lg font-mono"
              />
            </div>

            <Button onClick={verifyOtp} disabled={step2Loading || otp.length !== 6 || otpSeconds === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {step2Loading ? "Verifying…" : "Verify code"}
            </Button>

            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              Didn&apos;t receive it?{" "}
              <button type="button" onClick={resendOtp} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Resend
              </button>
            </p>
          </div>
        )}

        {/* Step 3 — New password */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-bold">Set new password</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a strong password.</p>
            </div>

            {step3Error && <p className="text-sm text-red-600 dark:text-red-400">{step3Error}</p>}

            <div>
              <Label htmlFor="new-pw">New password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="new-pw"
                  type={showNewPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                <PwCheck met={pwChecks.len} label="8+ chars" />
                <PwCheck met={pwChecks.upper} label="Uppercase" />
                <PwCheck met={pwChecks.num} label="Number" />
                <PwCheck met={pwChecks.sym} label="Symbol" />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-pw">Confirm password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirm-pw"
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitNewPw()}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button onClick={submitNewPw} disabled={step3Loading || !pwValid || newPw !== confirmPw} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {step3Loading ? "Updating…" : "Update password"}
            </Button>
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold">Password updated!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You can now sign in with your new password.</p>
            <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              ← Back to sign in
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
