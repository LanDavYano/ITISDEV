"use client"

/**
 * Voluntary logout — the user chose to sign out.
 *
 * Per spec this is different from an inactivity logout: nothing is retained.
 * Any saved input drafts are discarded, every other open tab is told to sign
 * out too, and the NextAuth session cookie is cleared.
 */

import { signOut } from "next-auth/react"
import { clearRetainedDraft, SYNC_CHANNEL, LAST_ACTIVITY_KEY } from "@/lib/session-timeout"

export async function voluntaryLogout(callbackUrl: string = "/") {
  try {
    clearRetainedDraft(null) // user opted out — retain nothing
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SYNC_CHANNEL)
      channel.postMessage({ type: "logout", reason: "voluntary" })
      channel.close()
    }
  } catch {
    /* never block sign-out on cleanup */
  }
  await signOut({ callbackUrl })
}
