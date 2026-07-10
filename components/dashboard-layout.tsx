"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { voluntaryLogout } from "@/lib/logout"
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from "@/components/notification-bell"
import {
  LayoutDashboard, Globe, ListChecks, MessageSquare, FileText,
  Settings, HelpCircle, Plus, Bell, Search, ChevronDown,
  User, LogOut,
} from "lucide-react"

const NAV_ITEMS = [
  { label: "LC Dashboard",      Icon: LayoutDashboard, href: "/dashboard" },
  { label: "Rating Submission", Icon: ListChecks,      href: "/performance" },
  { label: "EXPA Leads",        Icon: Globe,           href: "/expa-leads" },
  { label: "My Deliverables",   Icon: ListChecks,      href: "/my-task" },
  { label: "EB Updates",        Icon: MessageSquare,   href: "/chats" },
  { label: "Toolkits & Hub",    Icon: FileText,        href: "/documents" },
]

const BOTTOM_NAV = [
  { label: "Settings",       Icon: Settings,   href: "/profile" },
  { label: "Global Support", Icon: HelpCircle, href: "/support", badge: 2 },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  projects?: { id: string; name: string; color: string }[]
  onAddProject?: (project: { name: string; color: string }) => void
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const initials = session?.user
    ? `${session.user.firstName?.[0] ?? ""}${session.user.lastName?.[0] ?? ""}`.toUpperCase() || "G"
    : "G"

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-6 py-5 cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            A
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            AIESEC
          </span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ label, Icon, href }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Portfolios */}
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">
            My Portfolios
            <button className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => router.push("/projects")}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
            oGV Summer Peak
          </button>
          <button
            onClick={() => router.push("/projects")}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            Talent Management
          </button>
        </div>

        {/* Bottom nav */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
          {BOTTOM_NAV.map(({ label, Icon, href, badge }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname === href
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {badge && badge > 0 && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 w-72">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 w-full"
            />
            <span className="text-xs border border-gray-300 dark:border-gray-600 text-gray-400 px-1.5 py-0.5 rounded">⌘F</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/my-task")}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log EP Contact
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => router.push("/chats")}
              className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-500 rounded-full border-2 border-white dark:border-gray-900" />
            </button>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 transition-all"
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {session?.user?.name ?? "AIESEC Member"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {session?.user?.email ?? ""}
                    </p>
                    {session?.user?.role && (
                      <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {session.user.role}
                      </span>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); router.push("/profile") }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User className="w-4 h-4" /> View Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); router.push("/profile") }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={() => voluntaryLogout("/login")}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </div>
    </div>
  )
}
