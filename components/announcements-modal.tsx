"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Megaphone, X, CalendarClock } from "lucide-react"

/**
 * Login-first system announcements.
 *
 * Mounted on the landing pages (/dashboard and /admin). When the user arrives
 * after logging in, this overlay is the first thing they see — but only if
 * there are active announcements. Dismissing it sets a sessionStorage marker
 * so it doesn't reappear while navigating around; the login page clears the
 * marker so every fresh sign-in shows announcements again.
 *
 * Viewing is read-only — nothing about the user's account is modified.
 */

const SEEN_KEY = "announcementsSeen"

interface Announcement {
  _id: string
  title: string
  content: string
  postedAt: string
  expiresAt: string | null
  createdByName?: string
}

export default function AnnouncementsModal() {
  const { status } = useSession()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (status !== "authenticated") return
    if (typeof window !== "undefined" && sessionStorage.getItem(SEEN_KEY)) return

    fetch("/api/announcements")
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((data) => {
        const list = data.announcements ?? []
        if (list.length > 0) {
          setAnnouncements(list)
          setOpen(true)
        }
      })
      .catch(() => {
        /* announcements are non-critical — fail silently */
      })
  }, [status])

  const dismiss = () => {
    sessionStorage.setItem(SEEN_KEY, "1")
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white text-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Megaphone className="w-4.5 h-4.5 w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">System Announcements</h2>
              <p className="text-xs text-gray-500">
                {announcements.length} active announcement{announcements.length === 1 ? "" : "s"} from the PM team
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close announcements"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Announcement list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {announcements.map((a) => (
            <div key={a._id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.content}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-gray-500">
                <span>
                  Posted{" "}
                  {new Date(a.postedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {a.createdByName ? ` · ${a.createdByName}` : ""}
                </span>
                {a.expiresAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    Valid until{" "}
                    {new Date(a.expiresAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={dismiss}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            Got it, continue
          </button>
        </div>
      </div>
    </div>
  )
}
