"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Calendar, Lock, CheckCircle, AlertCircle, Loader2, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

interface PerformanceRecord {
  _id: string
  deliverablesAssigned: number
  deliverablesAnswered: number
  meetingsTotal: number
  meetingsAttended: number
  qualitativeAnswer: string
  quantitativeRating: number | null
}

interface FormData {
  deliverablesAssigned: number
  deliverablesAnswered: number
  meetingsTotal: number
  meetingsAttended: number
  qualitativeAnswer: string
  quantitativeRating: number
}

const DEFAULT_FORM: FormData = {
  deliverablesAssigned: 0,
  deliverablesAnswered: 0,
  meetingsTotal: 0,
  meetingsAttended: 0,
  qualitativeAnswer: "",
  quantitativeRating: 0,
}

export default function MyDeliverables() {
  const { data: session } = useSession()
  const [cycle, setCycle]           = useState<Cycle | null>(null)
  const [record, setRecord]         = useState<PerformanceRecord | null>(null)
  const [form, setForm]             = useState<FormData>(DEFAULT_FORM)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [cycleRes, recordRes] = await Promise.all([
          fetch("/api/cycles/current"),
          fetch("/api/performance/my"),
        ])
        const cycleData  = await cycleRes.json()
        const recordData = await recordRes.json()

        if (cycleData && !cycleData.error) setCycle(cycleData)
        if (recordData && !recordData.error) {
          setRecord(recordData)
          setForm({
            deliverablesAssigned: recordData.deliverablesAssigned ?? 0,
            deliverablesAnswered: recordData.deliverablesAnswered ?? 0,
            meetingsTotal:        recordData.meetingsTotal        ?? 0,
            meetingsAttended:     recordData.meetingsAttended     ?? 0,
            qualitativeAnswer:    recordData.qualitativeAnswer    ?? "",
            quantitativeRating:   recordData.quantitativeRating   ?? 0,
          })
        }
      } catch {
        setError("Failed to load cycle data.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isLocked = !cycle?.isOpen

  const handleNum = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: Number(value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    try {
      const url    = record ? `/api/performance/${record._id}` : "/api/performance"
      const method = record ? "PATCH" : "POST"

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to save submission.")
      } else {
        setRecord(data)
        setSuccess(record ? "Submission updated successfully!" : "Submission saved successfully!")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const completionRate = form.deliverablesAssigned > 0
    ? Math.round((form.deliverablesAnswered / form.deliverablesAssigned) * 100)
    : 0

  const attendanceRate = form.meetingsTotal > 0
    ? Math.round((form.meetingsAttended / form.meetingsTotal) * 100)
    : 0

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
          Your performance manager hasn&apos;t opened a submission cycle yet. Check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {cycle.periodMonth} {cycle.periodYear}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Performance Submission</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Welcome, {session?.user?.firstName ?? session?.user?.name ?? "Member"}
        </p>
      </div>

      {/* Deadline status card */}
      <div className={`rounded-2xl border p-4 mb-6 flex items-center gap-4 ${
        isLocked
          ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      }`}>
        {isLocked
          ? <Lock className="w-5 h-5 text-rose-500 flex-shrink-0" />
          : <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${
            isLocked ? "text-rose-700 dark:text-rose-400" : "text-blue-700 dark:text-blue-300"
          }`}>
            {isLocked ? "Submissions Closed" : "Submissions Open"}
          </p>
          <p className={`text-xs mt-0.5 ${
            isLocked ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
          }`}>
            Deadline: {formatDeadline(cycle.submissionDeadline)}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
          isLocked
            ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
            : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
        }`}>
          {cycle.periodMonth} {cycle.periodYear}
        </span>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          The submission deadline has passed. Your entries are now locked and cannot be edited.
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl mb-6">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Deliverables */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Deliverables</h2>
            {form.deliverablesAssigned > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                completionRate >= 80
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : completionRate >= 50
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
              }`}>
                {completionRate}% completed
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned">Deliverables Assigned</Label>
              <Input
                id="assigned"
                type="number"
                min={0}
                value={form.deliverablesAssigned}
                onChange={(e) => handleNum("deliverablesAssigned", e.target.value)}
                disabled={isLocked}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="answered">Deliverables Completed</Label>
              <Input
                id="answered"
                type="number"
                min={0}
                max={form.deliverablesAssigned}
                value={form.deliverablesAnswered}
                onChange={(e) => handleNum("deliverablesAnswered", e.target.value)}
                disabled={isLocked}
                className="mt-1.5"
              />
              {form.deliverablesAnswered > form.deliverablesAssigned && (
                <p className="text-xs text-rose-500 mt-1">Cannot exceed deliverables assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Meetings</h2>
            {form.meetingsTotal > 0 && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                attendanceRate >= 80
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : attendanceRate >= 50
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                  : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
              }`}>
                {attendanceRate}% attendance
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meetingsTotal">Total Meetings</Label>
              <Input
                id="meetingsTotal"
                type="number"
                min={0}
                value={form.meetingsTotal}
                onChange={(e) => handleNum("meetingsTotal", e.target.value)}
                disabled={isLocked}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="meetingsAttended">Meetings Attended</Label>
              <Input
                id="meetingsAttended"
                type="number"
                min={0}
                max={form.meetingsTotal}
                value={form.meetingsAttended}
                onChange={(e) => handleNum("meetingsAttended", e.target.value)}
                disabled={isLocked}
                className="mt-1.5"
              />
              {form.meetingsAttended > form.meetingsTotal && (
                <p className="text-xs text-rose-500 mt-1">Cannot exceed total meetings</p>
              )}
            </div>
          </div>
        </div>

        {/* Reflection */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Reflection</h2>
          <div className="space-y-5">
            <div>
              <Label htmlFor="qualitative">Qualitative Answer</Label>
              <Textarea
                id="qualitative"
                rows={4}
                placeholder="Share your reflections, highlights, and learnings for this period..."
                value={form.qualitativeAnswer}
                onChange={(e) => setForm((f) => ({ ...f, qualitativeAnswer: e.target.value }))}
                disabled={isLocked}
                className="mt-1.5 resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="rating">Self Rating</Label>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {form.quantitativeRating} / 100
                </span>
              </div>
              <input
                id="rating"
                type="range"
                min={0}
                max={100}
                value={form.quantitativeRating}
                onChange={(e) => handleNum("quantitativeRating", e.target.value)}
                disabled={isLocked}
                className="w-full accent-blue-600 disabled:opacity-50 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>
          </div>
        </div>

        {!isLocked && (
          <Button
            type="submit"
            disabled={
              submitting ||
              form.deliverablesAnswered > form.deliverablesAssigned ||
              form.meetingsAttended > form.meetingsTotal
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : record ? (
              "Update Submission"
            ) : (
              "Submit Performance"
            )}
          </Button>
        )}
      </form>
    </div>
  )
}
