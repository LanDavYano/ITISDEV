/**
 * Session-timeout configuration and retained-draft helpers (client-safe).
 *
 * Timing (per spec):
 *  - After WARN_AFTER_MS of inactivity, the user gets a warning that stays up
 *    for WARNING_WINDOW_MS. Clicking the warning keeps them signed in.
 *  - If the warning is not acknowledged, the user is logged out automatically.
 *  - HARD_CAP_MS is the absolute inactivity ceiling — no session may stay
 *    inactive past 5 minutes.
 *
 * Draft retention: when a user is logged out *by the system* (not by choice),
 * whatever they had typed into the page is stored locally so it can be
 * restored after they re-authenticate. Voluntary logout clears the drafts.
 */

export const WARN_AFTER_MS = 3 * 60 * 1000 // warning appears at 3 min idle
export const WARNING_WINDOW_MS = 30 * 1000 // warning stays up for 30 s
export const HARD_CAP_MS = 5 * 60 * 1000 // absolute inactivity ceiling (5 min)
export const IDLE_CHECK_INTERVAL_MS = 1000 // timer tick
export const ACTIVITY_THROTTLE_MS = 2000 // min gap between activity writes

/** localStorage key holding the shared last-activity timestamp (all tabs). */
export const LAST_ACTIVITY_KEY = "apmp:lastActivity"
/** BroadcastChannel name used to keep tabs in lockstep. */
export const SYNC_CHANNEL = "apmp:session-sync"
/** localStorage key prefix for retained (unsaved) inputs, per user. */
const DRAFT_KEY_PREFIX = "apmp:retained:"
/** Drafts older than this are ignored. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

export const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const

export interface RetainedField {
  key: string
  value: string
  checked?: boolean
}

export interface RetainedDraft {
  email: string
  path: string
  savedAt: number
  fields: RetainedField[]
}

const draftKey = (email: string) => `${DRAFT_KEY_PREFIX}${email.toLowerCase()}`

/** Identify a form control so it can be matched again after re-login. */
function fieldKey(el: Element, index: number): string {
  const tag = el.tagName.toLowerCase()
  const name = el.getAttribute("name")
  const id = el.getAttribute("id")
  if (name) return `${tag}[name="${name}"]`
  if (id) return `${tag}#${id}`
  return `${tag}@${index}` // positional fallback (same page structure)
}

/** Snapshot every non-sensitive input on the page into a retained draft. */
export function saveRetainedDraft(email: string, path: string) {
  try {
    const controls = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      )
    )
    const fields: RetainedField[] = []
    controls.forEach((el, index) => {
      const type = (el as HTMLInputElement).type
      if (type === "password" || type === "hidden" || type === "file") return
      const key = fieldKey(el, index)
      if (type === "checkbox" || type === "radio") {
        fields.push({ key, value: el.value, checked: (el as HTMLInputElement).checked })
      } else if (el.value) {
        fields.push({ key, value: el.value })
      }
    })
    if (fields.length === 0) return
    const draft: RetainedDraft = { email, path, savedAt: Date.now(), fields }
    localStorage.setItem(draftKey(email), JSON.stringify(draft))
  } catch {
    /* best effort — never block logout on a draft failure */
  }
}

/** Load a user's retained draft, if one exists and hasn't expired. */
export function loadRetainedDraft(email: string): RetainedDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(email))
    if (!raw) return null
    const draft = JSON.parse(raw) as RetainedDraft
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(draftKey(email))
      return null
    }
    return draft
  } catch {
    return null
  }
}

/** Remove a user's retained draft (used after restore or voluntary logout). */
export function clearRetainedDraft(email?: string | null) {
  try {
    if (email) {
      localStorage.removeItem(draftKey(email))
    } else {
      // No email known — clear every retained draft.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key?.startsWith(DRAFT_KEY_PREFIX)) localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Write the draft's values back into the page's form controls.
 * Uses the native value setter + input event so React-controlled inputs update.
 */
export function applyRetainedDraft(draft: RetainedDraft): number {
  let restored = 0
  const controls = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    )
  )
  const byKey = new Map<string, Element>()
  controls.forEach((el, index) => byKey.set(fieldKey(el, index), el))

  for (const field of draft.fields) {
    const el = byKey.get(field.key) as HTMLInputElement | HTMLTextAreaElement | null
    if (!el) continue
    try {
      if (field.checked !== undefined) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set
        setter?.call(el, field.checked)
        el.dispatchEvent(new Event("click", { bubbles: true }))
      } else {
        const proto =
          el.tagName === "TEXTAREA"
            ? HTMLTextAreaElement.prototype
            : el.tagName === "SELECT"
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
        setter?.call(el, field.value)
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
      }
      restored++
    } catch {
      /* skip fields that can't be restored */
    }
  }
  return restored
}
