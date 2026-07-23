"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Calendar, CheckCircle2, AlertCircle, Loader2, ClipboardList, Bell, ListChecks, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface AssignedItem {
  _id: string
  name: string
  description: string
  completed: boolean
  completedAt: string | null
  notifiedAt: string | null
}

interface PerformanceRecord {
  _id: string
  deliverables: AssignedItem[]
  meetings: AssignedItem[]
}

type ItemType = "deliverable" | "meeting"

export default function MyDeliverables() {
  const { data: session } = useSession()
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [record, setRecord] = useState<PerformanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [notifyingKey, setNotifyingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/performance/my")
      const data = await res.json()
      if (res.ok) {
        setCycle(data.cycle ?? null)
        setRecord(data.record ?? null)
      }
    } catch {
      showToast("Failed to load your assignments.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleNotify = async (itemType: ItemType, itemId: string) => {
    const key = `${itemType}:${itemId}`
    setNotifyingKey(key)
    try {
      const res = await fetch("/api/performance/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? "Failed to notify your team leader.", false)
        return
      }
      setRecord((prev) => {
        if (!prev) return prev
        const field = itemType === "deliverable" ? "deliverables" : "meetings"
        return {
          ...prev,
          [field]: prev[field].map((it) =>
            it._id === itemId ? { ...it, notifiedAt: data.notifiedAt } : it
          ),
        }
      })
      showToast(
        data.warning ?? "Your team leader has been notified.",
        !data.warning
      )
    } catch {
      showToast("Network error. Please try again.", false)
    } finally {
      setNotifyingKey(null)
      setConfirmingKey(null)
    }
  }

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center mt-16">
        <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No active cycle</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          There&apos;s no evaluation cycle open right now. Check back once one starts.
        </p>
      </div>
    )
  }

  const deliverables = record?.deliverables ?? []
  const meetings = record?.meetings ?? []

  const renderItem = (item: AssignedItem, itemType: ItemType) => {
    const key = `${itemType}:${item._id}`
    const isConfirming = confirmingKey === key
    const isNotifying = notifyingKey === key

    return (
      <div
        key={item._id}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.name}</p>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                {item.description}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
              item.completed
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            }`}
          >
            {item.completed ? "Done" : "Not Done"}
          </span>
        </div>

        {!item.completed && (
          <div className="mt-3">
            {item.notifiedAt ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Notified — awaiting your team leader&apos;s confirmation
              </p>
            ) : isConfirming ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Confirm you&apos;ve completed this?
                </span>
                <Button
                  size="sm"
                  disabled={isNotifying}
                  onClick={() => handleNotify(itemType, item._id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
                >
                  {isNotifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, notify"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isNotifying}
                  onClick={() => setConfirmingKey(null)}
                  className="h-7 px-3 text-xs"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmingKey(key)}
                className="h-7 px-3 text-xs"
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" /> Notify Team Leader
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
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
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {cycle.periodMonth} {cycle.periodYear} · Deadline {formatDeadline(cycle.submissionDeadline)}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Deliverables</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome, {session?.user?.firstName ?? session?.user?.name ?? "Member"}. These are the
          deliverables and meetings your team leader has assigned you for this cycle.
        </p>
      </div>

      {/* Deliverables */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deliverables</h2>
        </div>
        {deliverables.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No deliverables assigned yet.
          </div>
        ) : (
          <div className="space-y-3">{deliverables.map((d) => renderItem(d, "deliverable"))}</div>
        )}
      </div>

      {/* Meetings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Meetings</h2>
        </div>
        {meetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No meetings assigned yet.
          </div>
        ) : (
          <div className="space-y-3">{meetings.map((m) => renderItem(m, "meeting"))}</div>
        )}
      </div>

      {!cycle.isOpen && (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs px-4 py-3 rounded-xl mt-6">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          This cycle is closed. Your team leader can still see and update these items.
        </div>
      )}
    </div>
  )
}
