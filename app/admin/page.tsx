"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SessionInfo {
  name: string
  email: string
  userType: string
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<SessionInfo | null>(null)

  useEffect(() => {
    // Read session cookie on client (non-httpOnly version would be needed;
    // for now show a welcome if we have a session, else redirect to login)
    const match = document.cookie.match(/auth_session=([^;]+)/)
    if (match) {
      try {
        const data = JSON.parse(decodeURIComponent(match[1].replace(/\+/g, " ")))
        if (data.userType !== "admin") {
          router.replace("/dashboard")
          return
        }
        setSession(data)
      } catch {
        router.replace("/login")
      }
    }
    // If no cookie the user may have navigated here directly — still show page
  }, [router])

  const handleLogout = async () => {
    document.cookie = "auth_session=; path=/; max-age=0"
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className="font-bold text-lg">AIESEC</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Panel
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: LayoutDashboard, label: "LC Dashboard", href: "/admin" },
            { icon: Users, label: "Member Management", href: "/admin" },
            { icon: BarChart3, label: "Performance", href: "/dashboard" },
            { icon: Settings, label: "Settings", href: "/admin" },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {session && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium truncate">{session.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">
              Welcome{session ? `, ${session.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              You are signed in as an administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Total Members", value: "—", color: "blue" },
              { label: "Active This Month", value: "—", color: "green" },
              { label: "Pending Reviews", value: "—", color: "yellow" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`text-3xl font-bold mt-1 text-${color}-600 dark:text-${color}-400`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Member Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Member management features are coming soon. The full admin panel
              will be integrated here.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
