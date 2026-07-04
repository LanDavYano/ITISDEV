"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Flag,
  History,
  Loader2,
  Lock,
  Pencil,
  ClipboardList,
} from "lucide-react"

interface Cycle {
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface Detail {
  member: any
  cycle: Cycle | null
  record: any
  status: "Submitted" | "Submitted with flags" | "Not submitted"
  auditLogs: any[]
}

const EDIT_FIELDS = [
  { key: "personalGoal", label: "Personal goal", type: "text" },
  { key: "professionalGoal", label: "Professional goal", type: "text" },
  { key: "personalRating", label: "Personal rating (0–100)", type: "number" },
  { key: "professionalRating", label: "Professional rating (0–100)", type: "number" },
  { key: "deliverablesAssigned", label: "Deliverables assigned", type: "number" },
  { key: "deliverablesAnswered", label: "Deliverables answered", type: "number" },
  { key: "meetingsTotal", label: "Meetings total", type: "number" },
  { key: "meetingsAttended", label: "Meetings attended", type: "number" },
] as const

export default function AdminSubmissionDetailPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState("")

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/submissions/${params.id}`)
      const data = await res.json()
      if (res.ok) {
        setDetail(data)
        if (data.record) {
          const f: Record<string, string> = {}
          for (const { key } of EDIT_FIELDS) f[key] = (data.record[key] ?? "").toString()
          setForm(f)
        }
      } else if (res.status === 401) {
        router.push("/login")
      }
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login")
    if (authStatus === "authenticated") {
      if ((session?.user?.roleLevel ?? 1) < 2) {
        router.push("/dashboard")
        return
      }
      load()
    }
  }, [authStatus, session, router, load])

  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const body: Record<string, any> = {}
      for (const { key, type } of EDIT_FIELDS) {
        body[key] = type === "number" ? Number(form[key]) : form[key]
      }
      const res = await fetch(`/api/admin/submissions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes.")
        return
      }
      setEditing(false)
      showToast("Entry updated. The change was logged.", true)
      load()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleFlag = async (flagged: boolean) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/submissions/${params.id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged, reason: flagReason }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? "Failed to update flag.", false)
        return
      }
      setShowFlagModal(false)
      setFlagReason("")
      showToast(flagged ? "Entry flagged for review." : "Flag removed.", true)
      load()
    } catch {
      showToast("Network error. Please try again.", false)
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === "loading" || loading || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const { member, cycle, record, status, auditLogs } = detail
  const locked = !cycle?.isOpen
  const pillStyle =
    status === "Submitted"
      ? "bg-green-100 text-green-700"
      : status === "Submitted with flags"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700"

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Flag modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-bold mb-1 flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-600" /> Flag this entry
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Flag {member.firstName}&apos;s entry as inaccurate, incomplete, or
              suspicious. The reason is recorded in the audit log.
            </p>
            <Label htmlFor="flag-reason">Reason *</Label>
            <Textarea
              id="flag-reason"
              rows={3}
              className="mt-1.5 mb-4"
              placeholder="e.g. Meetings attended looks inflated vs. attendance sheet."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFlagModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={saving || !flagReason.trim()}
                onClick={() => handleFlag(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Flag entry"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIESEC
            </span>
            <span className="text-sm text-gray-500 ml-1">Submission Review</span>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Member + status */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              {member.firstName} {member.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {member.email} · {member.department?.name ?? "—"}
              {member.subDepartment?.name ? ` / ${member.subDepartment.name}` : ""} ·{" "}
              {member.role?.title ?? "Member"}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${pillStyle}`}>
            {status}
          </span>
        </div>

        {/* Cycle banner */}
        {cycle ? (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4 ${
              cycle.isOpen ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"
            }`}
          >
            <CalendarClock className={`w-5 h-5 ${cycle.isOpen ? "text-blue-600" : "text-amber-600"}`} />
            <div className="flex-1 min-w-[220px]">
              <p className="font-semibold text-sm">
                Cycle: {cycle.periodMonth} {cycle.periodYear}
              </p>
              <p className="text-xs text-gray-600">
                Deadline:{" "}
                {new Date(cycle.submissionDeadline).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                cycle.isOpen ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {cycle.isOpen ? (
                "Review window open"
              ) : (
                <>
                  <Lock className="w-3 h-3" /> Finalized — entries locked
                </>
              )}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
            No evaluation cycle exists yet.
          </div>
        )}

        {/* Flag banner */}
        {record?.isFlagged && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <Flag className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-amber-800">Flagged for review</p>
              <p className="text-sm text-amber-700 mt-0.5">{record.flagReason}</p>
            </div>
            {!locked && (
              <Button size="sm" variant="outline" disabled={saving} onClick={() => handleFlag(false)}>
                Remove flag
              </Button>
            )}
          </div>
        )}

        {/* No entry */}
        {!record && cycle && (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h2 className="font-semibold mb-1">No entry submitted for this cycle</h2>
            <p className="text-sm text-gray-500">
              {member.firstName} hasn&apos;t submitted a performance entry for{" "}
              {cycle.periodMonth} {cycle.periodYear}
              {cycle.isOpen ? " yet. Entries appear here as soon as they are submitted." : "."}
            </p>
          </div>
        )}

        {/* Entry (view / edit) */}
        {record && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">Submitted entry</h2>
              {!editing && (
                <div className="flex gap-2">
                  {!record.isFlagged && record.submittedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={locked}
                      onClick={() => setShowFlagModal(true)}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      <Flag className="w-3.5 h-3.5 mr-1.5" /> Flag
                    </Button>
                  )}
                  <Button size="sm" disabled={locked} onClick={() => setEditing(true)}>
                    {locked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Locked
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit entry
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {error && editing && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {editing ? (
              <div className="space-y-4">
                {EDIT_FIELDS.map(({ key, label, type }) =>
                  type === "text" ? (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <Textarea
                        id={key}
                        rows={2}
                        maxLength={2000}
                        value={form[key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      />
                    </div>
                  ) : null
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {EDIT_FIELDS.map(({ key, label, type }) =>
                    type === "number" ? (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={key} className="text-xs">
                          {label}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          min={0}
                          value={form[key] ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        />
                      </div>
                    ) : null
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    disabled={saving}
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save corrections
                  </Button>
                  <Button variant="outline" onClick={() => { setEditing(false); setError("") }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-gray-500 text-xs uppercase mb-1">
                    Personal goal
                  </dt>
                  <dd className="whitespace-pre-wrap">
                    {record.personalGoal ?? <em className="text-gray-400">Not provided</em>}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-500 text-xs uppercase mb-1">
                    Professional goal
                  </dt>
                  <dd className="whitespace-pre-wrap">
                    {record.professionalGoal ?? <em className="text-gray-400">Not provided</em>}
                  </dd>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {[
                    ["Personal rating", record.personalRating, "/ 100"],
                    ["Professional rating", record.professionalRating, "/ 100"],
                    ["Deliverables assigned", record.deliverablesAssigned, ""],
                    ["Deliverables answered", record.deliverablesAnswered, ""],
                    ["Meetings total", record.meetingsTotal, ""],
                    ["Meetings attended", record.meetingsAttended, ""],
                  ].map(([label, value, suffix]) => (
                    <div key={label as string} className="rounded-lg bg-gray-50 p-3 text-center">
                      <div className="text-xl font-bold text-gray-900">
                        {value ?? "—"}
                        {value != null && suffix ? (
                          <span className="text-xs font-medium text-gray-400"> {suffix}</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
                {record.submittedAt && (
                  <p className="text-xs text-gray-400 pt-1">
                    Submitted{" "}
                    {new Date(record.submittedAt).toLocaleString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </dl>
            )}
          </div>
        )}

        {/* Audit trail */}
        {record && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Change history
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No admin edits, flags, or assignments have been made to this entry.
              </p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log._id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[11px] font-bold uppercase ${
                          log.action === "flag"
                            ? "text-amber-600"
                            : log.action === "unflag"
                              ? "text-gray-500"
                              : log.action === "assign"
                                ? "text-purple-600"
                                : "text-blue-600"
                        }`}
                      >
                        {log.action === "assign" ? "counts assigned" : log.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.changes?.length > 0 && (
                      <ul className="text-sm space-y-1 mb-2">
                        {log.changes.map((c: any, i: number) => (
                          <li key={i} className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{c.field}:</span>
                            <span className="text-gray-400 line-through">{String(c.from ?? "—")}</span>
                            <span>→</span>
                            <span className="font-medium">{String(c.to ?? "—")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {log.note && <p className="text-sm text-gray-600 mb-2">“{log.note}”</p>}
                    <p className="text-xs text-gray-500">
                      By <span className="font-semibold">{log.actorName}</span>
                      {log.actorRole ? ` (${log.actorRole})` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
