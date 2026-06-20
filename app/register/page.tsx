"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<"admin" | "member">("member")
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  })

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire up real registration.
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative p-12 text-white">
        <Image
          src="/aiesec-classroom.jpg"
          alt="AIESEC members"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-blue-700/70" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white text-blue-700 flex items-center justify-center font-bold">
              A
            </div>
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              AIESEC
            </span>
          </Link>
        </div>
        <div className="relative z-10">
          <h2
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Your workspace, your way.
          </h2>
          <p className="text-blue-50 max-w-sm">
            The AIESEC Performance Management platform for members and admins.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-10">
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Use your AIESEC email to get started.{" "}
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              @aiesec.ph only
            </span>
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["admin", "member"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  role === r
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="font-semibold capitalize">{r}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {r === "admin" ? "Manage & oversee" : "Collaborate on tasks"}
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  required
                  placeholder="Alexa"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  required
                  placeholder="Pleyto"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">AIESEC Email</Label>
              <Input
                id="email"
                type="email"
                required
                pattern=".+@aiesec\.ph"
                title="Must be a valid @aiesec.ph address"
                placeholder="alexa.pleyto@aiesec.ph"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-400 mt-1">Must be @aiesec.ph</p>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Create a strong password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create account
            </Button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
            Already registered?{" "}
            <Link
              href="/login"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
