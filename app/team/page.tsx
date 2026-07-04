"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { roleHomePath } from "@/lib/roles"
import {
  ArrowLeft,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  Users,
} from "lucide-react"

interface Cycle {
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface TeamRow {
  member: {
    _id: string
    firstName: string
    lastName: string
    email: string
    role?: { title: string; level: number }
    subDepartment?: { name: string }
    department?: { name: string }
  }
  record: {
    deliverablesAssigned: number
    deliverablesAnswered: number
    meetingsTotal: number
    meetingsAttended: number
    submittedAt: string | null
  } | null
}

type CountsForm = {
  deliverablesAssigned: string
  deliverablesAnswered: string
  meetingsTotal: string
  meetingsAttended: string
}

const COUNT_FIELDS: { key: keyof CountsForm; label: string }[] = [
  { key: "deliverablesAssigned", label: "Deliv. assigned" },
  { key: "deliverablesAnswered", label: "Deliv. answered" },
  { key: "meetingsTotal", label: "Meetings total" },
  { key: "meetingsAttended", label: "Meetings attended" },
]

export default function TeamRecordsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [team, setTeam] = useState<TeamRow[]>([])
  const [forms, setForms] = useState<Record<string, CountsForm>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/team/records")
      const data = await res.json()
      if (res.ok) {
        setCycle(data.cycle)
        setTeam(data.team ?? [])
        const initial: Record<string, CountsForm> = {}
        for (const row of data.team ?? []) {
          initial[row.member._id] = {
            deliverablesAssigned: (row.record?.deliverablesAssigned ?? 0).toString(),
            deliverablesAnswered: (row.record?.deliverablesAnswered ?? 0).toString(),
            meetingsTotal: (row.record?.meetingsTotal ?? 0).toString(),
            meetingsAttended: (row.record?.meetingsAttended ?? 0).toString(),
          }
        }
        setForms(initial)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") {
      if ((session?.user?.roleLevel ?? 1) < 2) {
        router.push("/dashboard")
        return
      }
      load()
    }
  }, [status, session, router, load])

  const updateField = (memberId: string, key: keyof CountsForm, value: string) =>
    setForms((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [key]: value },
    }))

  const validateRow = (form: CountsForm): string | null => {
    for (const { key, label } of COUNT_FIELDS) {
      const num = Number(form[key])
      if (form[key] === "" || !Number.isInteger(num) || num < 0)
        return `${label} must be a whole number of 0 or more.`
    }
    if (Number(form.deliverablesAnswered) > Number(form.deliverablesAssigned))
      return "Deliverables answered cannot exceed deliverables assigned."
    if (Number(form.meetingsAttended) > Number(form.meetingsTotal))
      return "Meetings attended cannot exceed total meetings."
    return null
  }

  const handleSave = async (memberId: string, name: string) => {
    const form = forms[memberId]
    const clientError = validateRow(form)
    if (clientError) {
      showToast(clientError, false)
      return
    }

    setSavingId(memberId)
    try {
      const res = await fetch(`/api/team/records/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverablesAssigned: Number(form.deliverablesAssigned),
          deliverablesAnswered: Number(form.deliverablesAnswered),
          meetingsTotal: Number(form.meetingsTotal),
          meetingsAttended: Number(form.meetingsAttended),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? "Failed to save counts.", false)
        return
      }
      showToast(`Counts saved for ${name}.`, true)
    } catch {
      showToast("Network error. Please try again.", false)
    } finally {
      setSavingId(null)
    }
  }

  const deadlineLabel = cycle
    ? new Date(cycle.submissionDeadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Toast */}
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

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIESEC
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              Team Deliverables &amp; Meetings
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/performance"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              My own submission
            </Link>
            <Link
              href={roleHomePath(session?.user?.roleLevel)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Assign deliverables &amp; meetings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set each member&apos;s assigned deliverables and meeting counts for the
            current cycle. Members see these values on their own submission page.
          </p>
        </div>

        {/* Cycle banner */}
        {cycle ? (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4 mb-8 ${
              cycle.isOpen
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            }`}
          >
            <CalendarClock className={`w-5 h-5 ${cycle.isOpen ? "text-blue-600" : "text-amber-600"}`} />
            <div className="flex-1 min-w-[220px]">
              <p className="font-semibold text-sm">
                Current cycle: {cycle.periodMonth} {cycle.periodYear}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Deadline: {deadlineLabel}</p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                cycle.isOpen
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {cycle.isOpen ? "Open" : "Closed — assignments locked"}
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-10 text-center mb-8">
            <CalendarClock className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h2 className="font-semibold mb-1">No active evaluation cycle</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Counts can be assigned once a cycle is opened.
            </p>
          </div>
        )}

        {/* Team table */}
        {team.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-12 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <h2 className="font-semibold mb-1">No team members found</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No members are assigned to your sub-department yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {team.map(({ member, record }) => {
              const form = forms[member._id]
              if (!form) return null
              const isSelf = member._id === (session?.user as any)?.id
              return (
                <div
                  key={member._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="font-semibold text-sm">
                        {member.firstName} {member.lastName}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.email}
                        {member.subDepartment?.name ? ` · ${member.subDepartment.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        record?.submittedAt
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}
                    >
                      {record?.submittedAt ? "Form submitted" : "Form not submitted"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                    {COUNT_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {label}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          disabled={!cycle?.isOpen}
                          value={form[key]}
                          onChange={(e) => updateField(member._id, key, e.target.value)}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      disabled={!cycle?.isOpen || savingId === member._id}
                      onClick={() => handleSave(member._id, `${member.firstName} ${member.lastName}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {savingId === member._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : !cycle?.isOpen ? (
                        <>
                          <Lock className="w-3.5 h-3.5 mr-1.5" /> Locked
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
