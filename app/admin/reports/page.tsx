"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { roleHomePath } from "@/lib/roles"
import {
  ArrowLeft,
  AlertCircle,
  Download,
  FileBarChart,
  Loader2,
  Users,
} from "lucide-react"

type Scope = "member" | "subDepartment" | "department"

interface Option {
  id: string
  label: string
}

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
}

interface MemberRow {
  userId: string
  firstName: string
  lastName: string
  email: string
  department: string | null
  subDepartment: string | null
  role: string | null
  isProbationary: boolean
  cyclesIncluded: number
  cyclesSubmitted: number
  submissionRatePct: number | null
  avgFinalScore: number | null
  personalRatingAvg: number | null
  professionalRatingAvg: number | null
  attendance: { attended: number; total: number; pct: number | null }
  deliverables: { answered: number; assigned: number; pct: number | null }
}

interface ReportResult {
  scope: Scope
  scopeLabel: string
  periodLabel: string
  generatedAt: string
  generatedBy: string
  summary: {
    memberCount: number
    avgFinalScore: number | null
    avgAttendancePct: number | null
    avgDeliverablesPct: number | null
    submissionRatePct: number | null
  }
  members: MemberRow[]
}

const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`)
const fmtScore = (v: number | null) => (v === null ? "—" : String(v))

export default function PerformanceReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [members, setMembers] = useState<Option[]>([])
  const [subDepartments, setSubDepartments] = useState<Option[]>([])
  const [departments, setDepartments] = useState<Option[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])

  const [scope, setScope] = useState<Scope>("department")
  const [scopeId, setScopeId] = useState("")
  const [startCycleId, setStartCycleId] = useState("")
  const [endCycleId, setEndCycleId] = useState("")

  const [loadingOptions, setLoadingOptions] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportResult | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && (session?.user?.roleLevel ?? 1) < 3) {
      router.push("/dashboard")
    }
  }, [status, session, router])

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const [membersRes, subDeptRes, deptRes, cyclesRes] = await Promise.all([
        fetch("/api/admin/members"),
        fetch("/api/admin/sub-departments"),
        fetch("/api/admin/departments"),
        fetch("/api/cycles"),
      ])
      const [membersData, subDeptData, deptData, cyclesData] = await Promise.all([
        membersRes.json(),
        subDeptRes.json(),
        deptRes.json(),
        cyclesRes.json(),
      ])

      setMembers(
        (membersData.members ?? [])
          .map((m: any) => ({ id: m._id, label: `${m.firstName} ${m.lastName}` }))
          .sort((a: Option, b: Option) => a.label.localeCompare(b.label))
      )
      setSubDepartments(
        (subDeptData.subDepartments ?? [])
          .map((s: any) => ({ id: s._id, label: `${s.name} (${s.department?.name ?? "—"})` }))
          .sort((a: Option, b: Option) => a.label.localeCompare(b.label))
      )
      setDepartments(
        (deptData.departments ?? [])
          .map((d: any) => ({ id: d._id, label: d.name }))
          .sort((a: Option, b: Option) => a.label.localeCompare(b.label))
      )
      // Oldest first for the From/To range selects.
      setCycles([...(Array.isArray(cyclesData) ? cyclesData : [])].reverse())
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated" && (session?.user?.roleLevel ?? 1) >= 3) {
      loadOptions()
    }
  }, [status, session, loadOptions])

  const scopeOptions = scope === "member" ? members : scope === "subDepartment" ? subDepartments : departments

  const canGenerate = Boolean(scopeId && startCycleId && endCycleId) && !generating

  const handleScopeChange = (next: Scope) => {
    setScope(next)
    setScopeId("")
    setReport(null)
  }

  const generate = async () => {
    if (!scopeId || !startCycleId || !endCycleId) {
      setError("Choose a scope and both ends of the evaluation period before generating.")
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const params = new URLSearchParams({ scope, scopeId, startCycleId, endCycleId })
      const res = await fetch(`/api/admin/reports?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to generate report.")
        setReport(null)
        return
      }
      setReport(data)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const csvHref = useMemo(() => {
    if (!report) return null
    const params = new URLSearchParams({ scope, scopeId, startCycleId, endCycleId, format: "csv" })
    return `/api/admin/reports?${params.toString()}`
  }, [report, scope, scopeId, startCycleId, endCycleId])

  if (status === "loading" || loadingOptions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIESEC
            </span>
            <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">Performance Report</span>
          </div>
          <Link
            href={roleHomePath(session?.user?.roleLevel)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            Performance Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Summarize performance metrics and meeting attendance for a member, sub-department, or department
            over a chosen evaluation period.
          </p>
        </div>

        {/* ── Builder ── */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => handleScopeChange(e.target.value as Scope)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="member">Individual Member</option>
                <option value="subDepartment">Sub-Department</option>
                <option value="department">Department (incl. team leads)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                {scope === "member" ? "Member" : scope === "subDepartment" ? "Sub-Department" : "Department"}
              </label>
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {scopeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Evaluation Period — From
              </label>
              <select
                value={startCycleId}
                onChange={(e) => setStartCycleId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">Select a cycle…</option>
                {cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.periodMonth} {c.periodYear}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Evaluation Period — To
              </label>
              <select
                value={endCycleId}
                onChange={(e) => setEndCycleId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">Select a cycle…</option>
                {cycles.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.periodMonth} {c.periodYear}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!canGenerate && !generating && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Choose a scope and both ends of the evaluation period to generate a report.
            </p>
          )}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              Generate Report
            </button>

            {report && csvHref && (
              <a
                href={csvHref}
                download
                className="inline-flex items-center gap-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </a>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        {report && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{report.scopeLabel}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {report.periodLabel} · Generated {new Date(report.generatedAt).toLocaleString()} by {report.generatedBy}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Members", value: String(report.summary.memberCount), icon: Users },
                { label: "Avg Final Score", value: fmtScore(report.summary.avgFinalScore) },
                { label: "Submission Rate", value: fmtPct(report.summary.submissionRatePct) },
                { label: "Meeting Attendance", value: fmtPct(report.summary.avgAttendancePct) },
                { label: "Deliverables", value: fmtPct(report.summary.avgDeliverablesPct) },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                >
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Sub-Department</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Final Score</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Deliverables</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">
                        No members fall within this scope.
                      </td>
                    </tr>
                  )}
                  {report.members.map((m) => (
                    <tr key={m.userId} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.firstName} {m.lastName}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.subDepartment ?? "—"}</td>
                      <td className="px-4 py-3">{m.cyclesSubmitted}/{m.cyclesIncluded} ({fmtPct(m.submissionRatePct)})</td>
                      <td className="px-4 py-3 font-semibold">{fmtScore(m.avgFinalScore)}</td>
                      <td className="px-4 py-3">{m.attendance.attended}/{m.attendance.total} ({fmtPct(m.attendance.pct)})</td>
                      <td className="px-4 py-3">{m.deliverables.answered}/{m.deliverables.assigned} ({fmtPct(m.deliverables.pct)})</td>
                      <td className="px-4 py-3">
                        {m.isProbationary && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-medium">
                            Probationary
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
