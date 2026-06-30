"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Lock, Unlock, AlertCircle, CheckCircle, Loader2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isOpen: boolean
}

export default function DeadlineManagement() {
  const [cycles, setCycles]         = useState<Cycle[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState("")

  // Create cycle form
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating]     = useState(false)
  const [newMonth, setNewMonth]     = useState(MONTHS[new Date().getMonth()])
  const [newYear, setNewYear]       = useState(new Date().getFullYear())
  const [newDeadline, setNewDeadline] = useState("")

  // Adjust deadline
  const [adjustingId, setAdjustingId]         = useState<string | null>(null)
  const [adjustDeadline, setAdjustDeadline]   = useState("")
  const [adjusting, setAdjusting]             = useState(false)

  useEffect(() => { fetchCycles() }, [])

  async function fetchCycles() {
    setLoading(true)
    try {
      const res  = await fetch("/api/cycles")
      const data = await res.json()
      if (res.ok) setCycles(data)
      else setError("Failed to load cycles.")
    } catch {
      setError("Failed to load cycles.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setCreating(true)
    try {
      const res  = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodMonth: newMonth, periodYear: newYear, submissionDeadline: newDeadline }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create cycle.")
      } else {
        setCycles((prev) => [data, ...prev])
        setSuccess(`Cycle for ${newMonth} ${newYear} created.`)
        setShowCreate(false)
        setNewDeadline("")
      }
    } catch {
      setError("Failed to create cycle.")
    } finally {
      setCreating(false)
    }
  }

  async function handleAdjust(cycleId: string) {
    setError("")
    setSuccess("")
    setAdjusting(true)
    try {
      const res  = await fetch(`/api/cycles/${cycleId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionDeadline: adjustDeadline }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update deadline.")
      } else {
        setCycles((prev) => prev.map((c) => (c._id === cycleId ? { ...c, ...data } : c)))
        setSuccess("Deadline updated successfully.")
        setAdjustingId(null)
        setAdjustDeadline("")
      }
    } catch {
      setError("Failed to update deadline.")
    } finally {
      setAdjusting(false)
    }
  }

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const minDateTime = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    return d.toISOString().slice(0, 16)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deadline Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set and adjust submission deadlines per evaluation cycle
          </p>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setError(""); setSuccess("") }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Cycle
        </Button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl mb-5">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Create cycle form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Create Evaluation Cycle</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="newMonth">Month</Label>
              <select
                id="newMonth"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="newYear">Year</Label>
              <Input
                id="newYear"
                type="number"
                min={2024}
                max={2100}
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newDeadline">Submission Deadline</Label>
              <Input
                id="newDeadline"
                type="datetime-local"
                min={minDateTime()}
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-3 flex gap-3 pt-2">
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Cycle"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Cycles list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No cycles yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <div
              key={cycle._id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {cycle.isOpen
                    ? <Unlock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    : <Lock    className="w-5 h-5 text-rose-400    flex-shrink-0" />
                  }
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {cycle.periodMonth} {cycle.periodYear}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Deadline: {formatDeadline(cycle.submissionDeadline)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    cycle.isOpen
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                  }`}>
                    {cycle.isOpen ? "Open" : "Closed"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAdjustingId(cycle._id)
                      setAdjustDeadline("")
                      setError("")
                      setSuccess("")
                    }}
                    className="text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Adjust Deadline
                  </Button>
                </div>
              </div>

              {/* Inline adjust form */}
              {adjustingId === cycle._id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor={`adj-${cycle._id}`}>New Deadline (must be future date)</Label>
                    <Input
                      id={`adj-${cycle._id}`}
                      type="datetime-local"
                      min={minDateTime()}
                      value={adjustDeadline}
                      onChange={(e) => setAdjustDeadline(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <Button
                    onClick={() => handleAdjust(cycle._id)}
                    disabled={adjusting || !adjustDeadline}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {adjusting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setAdjustingId(null); setAdjustDeadline("") }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
