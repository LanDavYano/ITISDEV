"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { roleHomePath } from "@/lib/roles"
import NotificationBell from "@/components/notification-bell"
import {
  ArrowLeft,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  Users,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react"

interface Cycle {
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface AssignedItem {
  _id?: string
  name: string
  description: string
  completed: boolean
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
    deliverables: AssignedItem[]
    meetings: AssignedItem[]
    submittedAt: string | null
  } | null
}

type ItemField = "deliverables" | "meetings"

const emptyDraftItem = (): AssignedItem => ({ name: "", description: "", completed: false })

export default function TeamRecordsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [team, setTeam] = useState<TeamRow[]>([])
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Manage modal state
  const [managing, setManaging] = useState<TeamRow["member"] | null>(null)
  const [draft, setDraft] = useState<{ deliverables: AssignedItem[]; meetings: AssignedItem[] }>({
    deliverables: [],
    meetings: [],
  })
  const [newItem, setNewItem] = useState<Record<ItemField, AssignedItem>>({
    deliverables: emptyDraftItem(),
    meetings: emptyDraftItem(),
  })
  const [saving, setSaving] = useState(false)

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

  const openManage = (member: TeamRow["member"], record: TeamRow["record"]) => {
    setManaging(member)
    setDraft({
      deliverables: (record?.deliverables ?? []).map((d) => ({ ...d })),
      meetings: (record?.meetings ?? []).map((m) => ({ ...m })),
    })
    setNewItem({ deliverables: emptyDraftItem(), meetings: emptyDraftItem() })
  }

  const closeManage = () => {
    setManaging(null)
  }

  const addItem = (field: ItemField) => {
    const item = newItem[field]
    if (!item.name.trim()) {
      showToast("Give it a name first.", false)
      return
    }
    setDraft((prev) => ({ ...prev, [field]: [...prev[field], { ...item, name: item.name.trim() }] }))
    setNewItem((prev) => ({ ...prev, [field]: emptyDraftItem() }))
  }

  const updateItem = (field: ItemField, index: number, patch: Partial<AssignedItem>) => {
    setDraft((prev) => ({
      ...prev,
      [field]: prev[field].map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }))
  }

  const removeItem = (field: ItemField, index: number) => {
    setDraft((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
  }

  const handleSave = async () => {
    if (!managing) return
    if (draft.deliverables.some((d) => !d.name.trim()) || draft.meetings.some((m) => !m.name.trim())) {
      showToast("Every deliverable/meeting needs a name.", false)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/team/records/${managing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverables: draft.deliverables, meetings: draft.meetings }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? "Failed to save.", false)
        return
      }
      setTeam((prev) =>
        prev.map((row) =>
          row.member._id === managing._id
            ? { ...row, record: { ...(row.record ?? { submittedAt: null }), deliverables: data.deliverables, meetings: data.meetings } }
            : row
        )
      )
      showToast(`Saved for ${managing.firstName} ${managing.lastName}.`, true)
      closeManage()
    } catch {
      showToast("Network error. Please try again.", false)
    } finally {
      setSaving(false)
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

  const renderItemList = (field: ItemField, label: string) => (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <ListChecks className="w-4 h-4 text-blue-600" /> {label}
      </h4>
      <div className="space-y-2 mb-3">
        {draft[field].length === 0 && (
          <p className="text-xs text-gray-400 italic">None assigned yet.</p>
        )}
        {draft[field].map((item, index) => (
          <div
            key={item._id ?? `new-${index}`}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Input
                value={item.name}
                onChange={(e) => updateItem(field, index, { name: e.target.value })}
                disabled={!cycle?.isOpen}
                placeholder="Name"
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={!cycle?.isOpen}
                onClick={() => removeItem(field, index)}
                className="h-9 w-9 text-rose-500 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={item.description}
              onChange={(e) => updateItem(field, index, { description: e.target.value })}
              disabled={!cycle?.isOpen}
              placeholder="Description (optional)"
              rows={2}
              className="resize-none text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={item.completed}
                disabled={!cycle?.isOpen}
                onChange={(e) => updateItem(field, index, { completed: e.target.checked })}
                className="accent-blue-600"
              />
              Completed
            </label>
          </div>
        ))}
      </div>

      {cycle?.isOpen && (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 space-y-2">
          <Input
            value={newItem[field].name}
            onChange={(e) => setNewItem((prev) => ({ ...prev, [field]: { ...prev[field], name: e.target.value } }))}
            placeholder={`New ${label.toLowerCase().slice(0, -1)} name`}
          />
          <Textarea
            value={newItem[field].description}
            onChange={(e) =>
              setNewItem((prev) => ({ ...prev, [field]: { ...prev[field], description: e.target.value } }))
            }
            placeholder="Description (optional)"
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={newItem[field].completed}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, [field]: { ...prev[field], completed: e.target.checked } }))
                }
                className="accent-blue-600"
              />
              Mark completed
            </label>
            <Button type="button" size="sm" variant="outline" onClick={() => addItem(field)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )

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

      {/* Manage modal */}
      {managing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg">
                {managing.firstName} {managing.lastName}
              </h3>
              <button
                onClick={closeManage}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {cycle?.isOpen
                ? "Add, edit, or mark deliverables and meetings complete for this cycle."
                : "This cycle is closed — viewing only."}
            </p>

            <div className="space-y-6">
              {renderItemList("deliverables", "Deliverables")}
              {renderItemList("meetings", "Meetings")}
            </div>

            {cycle?.isOpen && (
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeManage} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            )}
          </div>
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
            <NotificationBell />
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
            Add named deliverables and meetings for each member, and mark them complete as they
            finish. Members see these on their own &quot;My Deliverables&quot; page and can notify
            you once they believe something&apos;s done.
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
              Deliverables can be assigned once a cycle is opened.
            </p>
          </div>
        )}

        {/* Team list */}
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
              const isSelf = member._id === (session?.user as any)?.id
              const deliverables = record?.deliverables ?? []
              const meetings = record?.meetings ?? []
              const deliverablesDone = deliverables.filter((d) => d.completed).length
              const meetingsDone = meetings.filter((m) => m.completed).length
              return (
                <div
                  key={member._id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          record?.submittedAt
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {record?.submittedAt ? "Form submitted" : "Form not submitted"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {deliverablesDone}/{deliverables.length} deliverables · {meetingsDone}/
                        {meetings.length} meetings
                      </span>
                      <Button
                        size="sm"
                        onClick={() => openManage(member, record)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {!cycle?.isOpen ? (
                          <>
                            <Lock className="w-3.5 h-3.5 mr-1.5" /> View
                          </>
                        ) : (
                          "Manage"
                        )}
                      </Button>
                    </div>
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
