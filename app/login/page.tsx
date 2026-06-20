"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire up real authentication.
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 relative p-12 text-white">
        <Image
          src="/aiesec-night.jpg"
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
            Welcome back, AIESECer.
          </h2>
          <p className="text-blue-50 max-w-sm">
            Sign in to the Performance Management System and keep growing the
            leader in you.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20">
        <div className="w-full max-w-md mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Sign in</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Use your AIESEC email to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">AIESEC Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="alexa.pleyto@aiesec.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/login"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Sign in
            </Button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
            New to AIESEC?{" "}
            <Link
              href="/register"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
