"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  WARN_AFTER_MS,
  WARNING_WINDOW_MS,
  HARD_CAP_MS,
  IDLE_CHECK_INTERVAL_MS,
  ACTIVITY_THROTTLE_MS,
  ACTIVITY_EVENTS,
  LAST_ACTIVITY_KEY,
  SYNC_CHANNEL,
  saveRetainedDraft,
  loadRetainedDraft,
  clearRetainedDraft,
  applyRetainedDraft,
} from "@/lib/session-timeout"

/**
 * SessionTimeoutProvider — global session security layer. Mounted once in the
 * root client layout; does nothing until the user is authenticated.
 *
 *  1. Inactivity tracking: mouse/keyboard/scroll/touch activity refreshes a
 *     shared timestamp in localStorage, so activity in ANY tab counts for all.
 *  2. Warning: after 3 minutes idle, a 30-second countdown warning appears.
 *     Clicking it keeps the session alive; passive movement does NOT dismiss
 *     it — the user must actually see and click it.
 *  3. Auto logout: if the warning expires unacknowledged (or the 5-minute
 *     hard cap is reached), the user is signed out and sent to /login.
 *  4. Unsaved changes: before an automatic logout, everything typed on the
 *     page is snapshotted and restored after the user re-authenticates.
 *  5. One-tab behavior: all tabs are kept in lockstep — navigation, warning
 *     acknowledgement, and logout in one tab happen in every tab.
 */
export default function SessionTimeoutProvider() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const [warningVisible, setWarningVisible] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_WINDOW_MS / 1000)
  const [restoredNotice, setRestoredNotice] = useState(false)

  const warningVisibleRef = useRef(false)
  const loggingOutRef = useRef(false)
  const lastWriteRef = useRef(0)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const restoreDoneRef = useRef(false)

  const email = session?.user?.email ?? null
  const authenticated = status === "authenticated"

  const readLastActivity = () => {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? value : Date.now()
  }

  const writeLastActivity = useCallback((ts: number) => {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts))
  }, [])

  /** Automatic (inactivity) logout: retain inputs, sync tabs, re-auth required. */
  const autoLogout = useCallback(async () => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    try {
      if (email) saveRetainedDraft(email, pathname)
      channelRef.current?.postMessage({ type: "logout", reason: "inactivity" })
    } catch {
      /* never block the logout */
    }
    await signOut({ redirect: false })
    window.location.href = "/login?timeout=1"
  }, [email, pathname])

  /** The user saw and clicked the warning — keep them signed in everywhere. */
  const acknowledgeWarning = useCallback(() => {
    writeLastActivity(Date.now())
    setWarningVisible(false)
    warningVisibleRef.current = false
  }, [writeLastActivity])

  // ── 1. Activity tracking (shared across tabs via localStorage) ────────────
  useEffect(() => {
    if (!authenticated) return

    // Fresh login / mount: reset the idle clock so a stale timestamp from a
    // previous session can't log the user out immediately.
    const last = readLastActivity()
    if (Date.now() - last >= WARN_AFTER_MS) writeLastActivity(Date.now())

    const onActivity = () => {
      // While the warning is up, passive activity must NOT dismiss it —
      // the spec requires the user to actually click the message.
      if (warningVisibleRef.current || loggingOutRef.current) return
      const now = Date.now()
      if (now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return
      lastWriteRef.current = now
      writeLastActivity(now)
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    )
    return () =>
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity))
  }, [authenticated, writeLastActivity])

  // ── 2 + 3. Idle timer: warning at 3 min, logout at 3:30 (hard cap 5 min) ──
  useEffect(() => {
    if (!authenticated) return

    const tick = () => {
      if (loggingOutRef.current) return
      const elapsed = Date.now() - readLastActivity()

      if (elapsed >= HARD_CAP_MS || elapsed >= WARN_AFTER_MS + WARNING_WINDOW_MS) {
        autoLogout()
        return
      }
      if (elapsed >= WARN_AFTER_MS) {
        const remaining = Math.ceil((WARN_AFTER_MS + WARNING_WINDOW_MS - elapsed) / 1000)
        setSecondsLeft(remaining)
        setWarningVisible(true)
        warningVisibleRef.current = true
      } else if (warningVisibleRef.current) {
        // Another tab acknowledged the warning (shared timestamp moved).
        setWarningVisible(false)
        warningVisibleRef.current = false
      }
    }

    const interval = setInterval(tick, IDLE_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [authenticated, autoLogout])

  // ── 5. One-tab lockstep: navigation + logout sync via BroadcastChannel ────
  useEffect(() => {
    if (!authenticated || typeof BroadcastChannel === "undefined") return

    const channel = new BroadcastChannel(SYNC_CHANNEL)
    channelRef.current = channel

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg?.type === "route" && typeof msg.path === "string") {
        // Whatever page one tab goes to, every tab goes to.
        if (msg.path !== window.location.pathname) router.push(msg.path)
      } else if (msg?.type === "logout") {
        if (loggingOutRef.current) return
        loggingOutRef.current = true
        signOut({ redirect: false }).then(() => {
          window.location.href =
            msg.reason === "inactivity" ? "/login?timeout=1" : "/"
        })
      }
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [authenticated, router])

  // Broadcast this tab's navigation so the other tabs follow.
  useEffect(() => {
    if (!authenticated) return
    channelRef.current?.postMessage({ type: "route", path: pathname })
  }, [authenticated, pathname])

  // ── 4. Restore retained inputs after re-authentication ────────────────────
  // Retries for a while because the form may render late (data fetching) or
  // only after the user opens an edit view. The draft is only cleared once
  // something was actually restored.
  useEffect(() => {
    if (!authenticated || !email || restoreDoneRef.current) return
    const draft = loadRetainedDraft(email)
    if (!draft || draft.path !== pathname) return
    restoreDoneRef.current = true

    let attempts = 0
    const tryRestore = () => {
      attempts++
      const restored = applyRetainedDraft(draft)
      if (restored > 0) {
        clearRetainedDraft(email)
        setRestoredNotice(true)
        setTimeout(() => setRestoredNotice(false), 5000)
        clearInterval(retryTimer)
      } else if (attempts >= 20) {
        // Give up for now but keep the draft (TTL cleans it up eventually).
        clearInterval(retryTimer)
        restoreDoneRef.current = false
      }
    }
    const retryTimer = setInterval(tryRestore, 1500)
    return () => clearInterval(retryTimer)
  }, [authenticated, email, pathname])

  if (!authenticated) return null

  return (
    <>
      {/* Inactivity warning — must be clicked to stay signed in */}
      {warningVisible && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4"
          onClick={acknowledgeWarning}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl p-6 text-center cursor-pointer"
            onClick={acknowledgeWarning}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold mb-1">Are you still there?</h2>
            <p className="text-sm text-gray-600 mb-1">
              You&apos;ve been inactive for a while. For your security you will be
              logged out in
            </p>
            <p className="text-3xl font-bold text-amber-600 my-3">{secondsLeft}s</p>
            <p className="text-xs text-gray-500 mb-5">
              Your unsaved inputs will be kept and restored when you sign back in.
            </p>
            <button
              onClick={acknowledgeWarning}
              className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 transition-colors"
            >
              I&apos;m still here — keep me signed in
            </button>
          </div>
        </div>
      )}

      {/* Small confirmation after retained inputs are restored */}
      {restoredNotice && (
        <div className="fixed top-4 right-4 z-[300] flex items-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm text-white shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          Your unsaved inputs from before the timeout were restored.
        </div>
      )}
    </>
  )
}
