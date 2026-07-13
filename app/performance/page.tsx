"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { roleHomePath } from "@/lib/roles"
import {
  ArrowLeft,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Pencil,
  Users,
} from "lucide-react"

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface PerfRecord {
  _id: string
  personalGoal: string | null
  professionalGoal: string | null
  personalRating: number | null
  professionalRating: number | null
  submittedAt: string | null
  deliverablesAssigned: number
  deliverablesAnswered: number
  meetingsTotal: number
  meetingsAttended: number
  isFlagged: boolean
  flagReason: string | null
}

export default function PerformanceSubmissionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [record, setRecord] = useState<PerfRecord | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [justSubmitted, setJustSubmitted] = useState(false)

  const [form, setForm] = useState({
    personalGoal: "",
    professionalGoal: "",
    personalRating: "",
    professionalRating: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/performance/my")
      const data = await res.json()
      if (res.ok) {
        setCycle(data.cycle)
        setRecord(data.record)
        if (data.record) {
          setForm({
            personalGoal: data.record.personalGoal ?? "",
            professionalGoal: data.record.professionalGoal ?? "",
            personalRating: data.record.personalRating?.toString() ?? "",
            professionalRating: data.record.professionalRating?.toString() ?? "",
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") load()
  }, [status, router, load])

  const validate = (): string | null => {
    if (!form.personalGoal.trim()) return "Personal goal is required."
    if (!form.professionalGoal.trim()) return "Professional goal is required."
    if (form.personalGoal.trim().length < 60 || form.professionalGoal.trim().length < 60)
      return "Goals must be at least 60 characters."
    for (const [label, value] of [
      ["Personal rating", form.personalRating],
      ["Professional rating", form.professionalRating],
    ] as const) {
      const num = Number(value)
      if (value === "" || !Number.isFinite(num) || num < 0 || num > 100)
        return `${label} must be a number between 0 and 100.`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const clientError = validate()
    if (clientError) {
      setError(clientError)
      return
    }

    setSaving(true)
    try {
      const isEdit = Boolean(record?.submittedAt)
      const res = await fetch(
        isEdit ? `/api/performance/${record!._id}` : "/api/performance",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personalGoal: form.personalGoal.trim(),
            professionalGoal: form.professionalGoal.trim(),
            personalRating: Number(form.personalRating),
            professionalRating: Number(form.professionalRating),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.")
        return
      }
      setRecord(data)
      setEditing(false)
      setJustSubmitted(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const deadlineLabel = cycle
    ? new Date(cycle.submissionDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : ""

  const submitted = Boolean(record?.submittedAt)
  const showForm = cycle?.isOpen && (!submitted || editing)

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIESEC
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              Performance Submission
            </span>
          </div>
          <Link
            href={roleHomePath(session?.user?.roleLevel)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* ── Cycle banner ── */}
        {cycle ? (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4 mb-8 ${
              cycle.isOpen
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            }`}
          >
            <CalendarClock
              className={`w-5 h-5 ${cycle.isOpen ? "text-blue-600" : "text-amber-600"}`}
            />
            <div className="flex-1 min-w-[220px]">
              <p className="font-semibold text-sm">
                Current cycle: {cycle.periodMonth} {cycle.periodYear}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Submission deadline: {deadlineLabel}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                cycle.isOpen
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {cycle.isOpen ? "Open for submissions" : "Closed"}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-10 text-center">
            <ClipboardList className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h2 className="font-semibold mb-1">No active evaluation cycle</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              There is no evaluation cycle yet. Please check back once your
              performance manager opens one.
            </p>
          </div>
        )}

        {/* ── Success confirmation ── */}
        {justSubmitted && submitted && !editing && (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-4 mb-6 text-green-800 dark:text-green-300">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Your performance submission was saved successfully. You can review
              it below{cycle?.isOpen ? " and edit it while the window is open" : ""}.
            </p>
          </div>
        )}

        {/* ── Closed + nothing submitted ── */}
        {cycle && !cycle.isOpen && !submitted && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-10 text-center">
            <Lock className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h2 className="font-semibold mb-1">Submissions are closed</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The {cycle.periodMonth} {cycle.periodYear} cycle is closed and you
              did not submit an entry. Contact your performance manager if you
              believe this is an error.
            </p>
          </div>
        )}

        {/* ── Review view (submitted) ── */}
        {cycle && submitted && !editing && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">Your submission</h2>
                {cycle.isOpen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setJustSubmitted(false)
                      setEditing(true)
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <Lock className="w-3.5 h-3.5" /> Locked — cycle closed
                  </span>
                )}
              </div>

              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                    Personal goal for the period
                  </dt>
                  <dd className="whitespace-pre-wrap">{record!.personalGoal}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                    Professional goal for the period
                  </dt>
                  <dd className="whitespace-pre-wrap">{record!.professionalGoal}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {record!.personalRating}
                      <span className="text-sm font-medium text-gray-400"> / 100</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Personal rating
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {record!.professionalRating}
                      <span className="text-sm font-medium text-gray-400"> / 100</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Professional rating
                    </div>
                  </div>
                </div>
              </dl>

              <p className="text-xs text-gray-400 mt-5">
                Submitted{" "}
                {new Date(record!.submittedAt!).toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Team-leader-assigned counts (read-only for members) */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-sm">
                  Deliverables &amp; meetings{" "}
                  <span className="font-normal text-gray-400">
                    (assigned by your team leader)
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                {[
                  ["Deliverables assigned", record!.deliverablesAssigned],
                  ["Deliverables answered", record!.deliverablesAnswered],
                  ["Total meetings", record!.meetingsTotal],
                  ["Meetings attended", record!.meetingsAttended],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                    <div className="text-xl font-bold">{value as number}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Structured form ── */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-6"
          >
            <div>
              <h2 className="font-bold text-lg">
                {submitted ? "Edit your submission" : "Submit your performance entry"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Hi {session?.user?.firstName ?? session?.user?.name}, fill in your
                goals (qualitative) and self-ratings (quantitative) for{" "}
                {cycle!.periodMonth} {cycle!.periodYear}. All fields are required.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="personalGoal">Personal goal for the period *</Label>
              <Textarea
                id="personalGoal"
                required
                rows={3}
                minLength={60}
                maxLength={2000}
                placeholder="e.g. Improve my time management and finish tasks ahead of deadlines."
                value={form.personalGoal}
                onChange={(e) => setForm((f) => ({ ...f, personalGoal: e.target.value }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.personalGoal.trim().length}/60 characters minimum
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="professionalGoal">Professional goal for the period *</Label>
              <Textarea
                id="professionalGoal"
                required
                rows={3}
                minLength={60}
                maxLength={2000}
                placeholder="e.g. Onboard two new members and lead one EP consultation call."
                value={form.professionalGoal}
                onChange={(e) => setForm((f) => ({ ...f, professionalGoal: e.target.value }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.professionalGoal.trim().length}/60 characters minimum
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="personalRating">Personal rating (0–100) *</Label>
                <Input
                  id="personalRating"
                  type="number"
                  required
                  min={0}
                  max={100}
                  step={1}
                  placeholder="e.g. 85"
                  value={form.personalRating}
                  onChange={(e) => setForm((f) => ({ ...f, personalRating: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="professionalRating">Professional rating (0–100) *</Label>
                <Input
                  id="professionalRating"
                  type="number"
                  required
                  min={0}
                  max={100}
                  step={1}
                  placeholder="e.g. 88"
                  value={form.professionalRating}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, professionalRating: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : submitted ? (
                  "Save changes"
                ) : (
                  "Submit entry"
                )}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
