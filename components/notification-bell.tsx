"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, X, CheckCheck, CalendarClock, AlertTriangle, Lock, Info, CheckCircle2 } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
  isManuallyClosed: boolean
  isArchived: boolean
}

// A real, persisted notification (e.g. a member telling their team leader
// they've completed a deliverable/meeting) from GET /api/notifications.
interface RealNotification {
  _id: string
  itemType: "deliverable" | "meeting"
  itemName: string
  periodMonth: string
  periodYear: number
  message: string
  read: boolean
  createdAt: string
}

interface AppNotification {
  id: string
  type: "info" | "warning" | "urgent" | "locked" | "done"
  title: string
  message: string
  icon: React.ReactNode
  // "real" notifications are read-tracked server-side (GET/PATCH /api/notifications);
  // "cycle" ones are the synthetic, date-derived reminders below, tracked via localStorage.
  source: "real" | "cycle"
  read?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DISMISSED_KEY = "notificationsDismissed_v1"

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>) {
  if (typeof window === "undefined") return
  try {
    const arr = [...ids].slice(-50)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(arr))
  } catch {
    /* ignore */
  }
}

function buildNotifications(cycle: Cycle | null): Omit<AppNotification, "source">[] {
  const now = new Date()
  const day = now.getDate()

  if (!cycle) {
    return [
      {
        id: "no-cycle",
        type: "info",
        title: "No Active Cycle",
        message:
          "There is no active evaluation cycle right now. Check back when your Performance Manager opens one.",
        icon: <Info className="w-4 h-4" />,
      },
    ]
  }

  const label = `${cycle.periodMonth} ${cycle.periodYear}`
  const isClosed = !cycle.isOpen

  if (isClosed) {
    return [
      {
        id: `closed-${cycle._id}`,
        type: "locked",
        title: "Cycle Closed",
        message: `The ${label} evaluation cycle is now closed. Previous member entries cannot be edited.`,
        icon: <Lock className="w-4 h-4" />,
      },
    ]
  }

  const notes: Omit<AppNotification, "source">[] = []

  // Start of month: days 1–5
  if (day >= 1 && day <= 5) {
    notes.push({
      id: `start-${cycle._id}-${cycle.periodMonth}-${cycle.periodYear}`,
      type: "info",
      title: "Monthly Tool Now Open",
      message: `📋 The monthly performance tool for ${label} is now open. Make sure to submit your entry before the deadline!`,
      icon: <CalendarClock className="w-4 h-4" />,
    })
  }

  // Third week: days 15–21
  if (day >= 15 && day <= 21) {
    notes.push({
      id: `week3-${cycle._id}-${cycle.periodMonth}-${cycle.periodYear}`,
      type: "warning",
      title: "Midpoint Reminder",
      message: `⏰ You're in the final stretch! Don't forget to submit your monthly team tool for ${label}.`,
      icon: <AlertTriangle className="w-4 h-4" />,
    })
  }

  // End of month: days 22–end
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  if (day >= 22 && day <= lastDay) {
    notes.push({
      id: `end-${cycle._id}-${cycle.periodMonth}-${cycle.periodYear}`,
      type: "urgent",
      title: "Deadline Approaching!",
      message: `🚨 The ${label} evaluation cycle closes soon. Submit or review your entry now before it's locked.`,
      icon: <AlertTriangle className="w-4 h-4" />,
    })
  }

  // Fallback: open but outside trigger windows
  if (notes.length === 0) {
    notes.push({
      id: `open-${cycle._id}`,
      type: "info",
      title: "Cycle Open",
      message: `The ${label} evaluation cycle is currently open. Remember to submit your monthly performance entry.`,
      icon: <CalendarClock className="w-4 h-4" />,
    })
  }

  return notes
}

// ── Color maps ─────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<AppNotification["type"], string> = {
  info:    "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  urgent:  "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  locked:  "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
  done:    "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
}

const BADGE_STYLES: Record<AppNotification["type"], string> = {
  info:    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  urgent:  "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  locked:  "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  done:    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
}

const BADGE_LABEL: Record<AppNotification["type"], string> = {
  info:    "Info",
  warning: "Reminder",
  urgent:  "Urgent",
  locked:  "Locked",
  done:    "Team",
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [cycle, setCycle] = useState<Cycle | null | undefined>(undefined) // undefined = loading
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [realNotifications, setRealNotifications] = useState<RealNotification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch current cycle + real (persisted) notifications once on mount
  useEffect(() => {
    setDismissed(getDismissed())
    fetch("/api/cycles/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCycle(data))
      .catch(() => setCycle(null))
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((data) => setRealNotifications(data.notifications ?? []))
      .catch(() => {
        /* real notifications are non-critical — fail silently */
      })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const realAsApp: AppNotification[] = realNotifications.map((n) => ({
    id: `real-${n._id}`,
    type: "done",
    title: n.itemType === "deliverable" ? "Deliverable Update" : "Meeting Update",
    message: n.message,
    icon: <CheckCircle2 className="w-4 h-4" />,
    source: "real",
    read: n.read,
  }))

  const cycleAsApp: AppNotification[] = (cycle !== undefined ? buildNotifications(cycle) : []).map(
    (n) => ({ ...n, source: "cycle" as const })
  )

  const allNotifications = [...realAsApp, ...cycleAsApp]
  const isRead = (n: AppNotification) => (n.source === "real" ? !!n.read : dismissed.has(n.id))
  const unread = allNotifications.filter((n) => !isRead(n))

  const dismissOne = async (n: AppNotification) => {
    if (n.source === "real") {
      const realId = n.id.replace(/^real-/, "")
      setRealNotifications((prev) => prev.map((r) => (r._id === realId ? { ...r, read: true } : r)))
      try {
        await fetch(`/api/notifications/${realId}`, { method: "PATCH" })
      } catch {
        /* best-effort — worst case it shows unread again after a refresh */
      }
      return
    }
    const next = new Set(dismissed)
    next.add(n.id)
    setDismissed(next)
    saveDismissed(next)
  }

  const dismissAll = async () => {
    const next = new Set(dismissed)
    cycleAsApp.forEach((n) => next.add(n.id))
    setDismissed(next)
    saveDismissed(next)

    const unreadReal = realNotifications.filter((r) => !r.read)
    if (unreadReal.length > 0) {
      setRealNotifications((prev) => prev.map((r) => ({ ...r, read: true })))
      await Promise.allSettled(
        unreadReal.map((r) => fetch(`/api/notifications/${r._id}`, { method: "PATCH" }))
      )
    }
    setOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* ── Bell Button ── */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open notifications"
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white dark:border-gray-900 animate-pulse">
            {unread.length}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div
          id="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                Notifications
              </h3>
              {unread.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {unread.length} new
                </span>
              )}
            </div>
            {allNotifications.length > 0 && unread.length > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {cycle === undefined ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading notifications…
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No notifications right now
              </div>
            ) : (
              allNotifications.map((n) => {
                const read = isRead(n)
                return (
                  <div
                    key={n.id}
                    className={`relative flex gap-3 px-4 py-3.5 transition-all ${read ? "opacity-50" : ""}`}
                  >
                    {/* Icon badge */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${TYPE_STYLES[n.type]}`}
                    >
                      {n.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                          {n.title}
                        </p>
                        <span
                          className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[n.type]}`}
                        >
                          {BADGE_LABEL[n.type]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                        {n.message}
                      </p>
                    </div>

                    {/* Dismiss */}
                    {!read && (
                      <button
                        onClick={() => dismissOne(n)}
                        className="absolute top-2.5 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
              Reminders are based on the current active evaluation cycle.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
