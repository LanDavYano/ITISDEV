"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { voluntaryLogout } from "@/lib/logout"

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const STYLES = `
:root {
  --bg-main: #fcfcfc;
  --sidebar-bg: #f5f6f7;
  --active-item-bg: #e6f0ff;
  --text-color: #111;
  --text-sub: #777;
  --border-color: #eaeaea;
  --primary-blue: #037ef3;
  --primary-hover: #026bd6;
  --secondary-bg: #f3f4f6;
  --danger-red: #ef4444;
  --success-green: #10b981;
  --warning-yellow: #f59e0b;
  --shadow-main: 0 2px 10px rgba(0,0,0,0.03);
}
.dl-root * { margin:0; padding:0; box-sizing:border-box; }
.dl-root { font-family:'Inter',sans-serif; color:var(--text-color); background:var(--bg-main); }
.dl-app { display:flex; height:100vh; }
.dl-sidebar { width:260px; background:var(--sidebar-bg); border-right:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; padding:24px; flex-shrink:0; }
.dl-logo { font-size:22px; font-weight:700; margin-bottom:40px; color:var(--primary-blue); }
.dl-menu { list-style:none; }
.dl-menu-item { display:flex; align-items:center; padding:12px 16px; border-radius:8px; cursor:pointer; margin-bottom:8px; color:var(--text-sub); font-weight:500; font-size:14px; transition:background 0.15s; }
.dl-menu-item:hover { background:var(--secondary-bg); }
.dl-menu-item.active { background:var(--active-item-bg); color:var(--primary-blue); font-weight:600; }
.dl-main { flex:1; overflow-y:auto; display:flex; flex-direction:column; }
.dl-header { height:70px; display:flex; align-items:center; justify-content:space-between; padding:0 30px; border-bottom:1px solid var(--border-color); background:#fff; flex-shrink:0; }
.dl-header-search { position:relative; width:350px; }
.dl-header-search input { width:100%; padding:10px 35px 10px 15px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-main); font-size:14px; outline:none; }
.dl-body { padding:28px 30px; flex:1; }
.dl-intro { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; }
.dl-date { font-size:12px; color:var(--text-sub); margin-bottom:4px; }
.dl-greeting { font-size:26px; font-weight:700; }
.dl-btn { padding:10px 18px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; border:none; transition:background 0.15s; }
.dl-btn-primary { background:var(--primary-blue); color:#fff; }
.dl-btn-primary:hover { background:var(--primary-hover); }
.dl-btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
.dl-btn-secondary { background:var(--secondary-bg); color:var(--text-color); border:1px solid var(--border-color); }
.dl-btn-secondary:hover { background:#e5e7eb; }
.dl-card { background:#fff; border:1px solid var(--border-color); border-radius:12px; margin-bottom:20px; overflow:hidden; box-shadow:var(--shadow-main); }
.dl-card-header { padding:18px 24px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; }
.dl-card-title { font-size:16px; font-weight:600; }
.dl-cycle-row { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid var(--border-color); }
.dl-cycle-row:last-child { border-bottom:none; }
.dl-cycle-period { font-size:15px; font-weight:600; }
.dl-cycle-deadline { font-size:13px; color:var(--text-sub); margin-top:3px; }
.dl-pill { display:inline-block; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; }
.dl-pill-open { background:#d1fae5; color:#065f46; }
.dl-pill-closed { background:#fee2e2; color:#991b1b; }
.dl-pill-archived { background:#e5e7eb; color:#374151; }
.dl-actions { display:flex; align-items:center; gap:10px; }
.dl-input { padding:9px 13px; border-radius:8px; border:1px solid var(--border-color); font-size:13px; outline:none; background:#fff; }
.dl-input:focus { border-color:var(--primary-blue); }
.dl-select { padding:9px 13px; border-radius:8px; border:1px solid var(--border-color); font-size:13px; outline:none; background:#fff; cursor:pointer; }
.dl-form-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; padding:20px 24px; }
.dl-form-label { font-size:12px; font-weight:600; color:var(--text-sub); margin-bottom:6px; display:block; text-transform:uppercase; letter-spacing:0.04em; }
.dl-alert { padding:12px 16px; border-radius:8px; font-size:13px; font-weight:500; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
.dl-alert-success { background:#d1fae5; color:#065f46; border:1px solid #a7f3d0; }
.dl-alert-error { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
.dl-empty { padding:48px; text-align:center; color:var(--text-sub); font-size:14px; }
.dl-spinner { width:20px; height:20px; border:2px solid #e5e7eb; border-top-color:var(--primary-blue); border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; vertical-align:middle; margin-right:6px; }
@keyframes spin { to { transform:rotate(360deg); } }
.dl-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:100; }
.dl-modal-box { background:#fff; border-radius:16px; padding:32px; width:500px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
.dl-modal-title { font-size:20px; font-weight:700; margin-bottom:24px; }
.dl-modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
.dl-modal-field { display:flex; flex-direction:column; gap:6px; }
.dl-modal-label { font-size:12px; font-weight:600; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.04em; }
.dl-modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:24px; }
`

interface Cycle {
  _id: string
  periodMonth: string
  periodYear: number
  submissionDeadline: string
  isManuallyClosed?: boolean
  isArchived?: boolean
  archivedAt?: string | null
  closedAt?: string | null
  isDeadlineClosed?: boolean
  canExtend?: boolean
  isPastPeriod?: boolean
  isOpen: boolean
}

export default function DeadlineManagementPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isDeptLeader = (session?.user as any)?.roleLevel >= 3

  const [cycles, setCycles]               = useState<Cycle[]>([])
  const [loading, setLoading]             = useState(true)
  const [successMsg, setSuccessMsg]       = useState("")
  const [errorMsg, setErrorMsg]           = useState("")

  // Create form
  const [showCreate, setShowCreate]       = useState(false)
  const [creating, setCreating]           = useState(false)
  const [newMonth, setNewMonth]           = useState(MONTHS[new Date().getMonth()])
  const [newYear, setNewYear]             = useState(new Date().getFullYear())
  const [newDeadline, setNewDeadline]     = useState("")

  // Adjust deadline
  const [adjustingId, setAdjustingId]     = useState<string | null>(null)
  const [adjustDeadline, setAdjustDeadline] = useState("")
  const [adjusting, setAdjusting]         = useState(false)
  const [closingId, setClosingId]         = useState<string | null>(null)
  const [openingId, setOpeningId]         = useState<string | null>(null)
  const [extendingId, setExtendingId]     = useState<string | null>(null)
  const [extendDeadline, setExtendDeadline] = useState("")
  const [extending, setExtending]         = useState(false)

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  const minDateTime = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 5)
    return d.toISOString().slice(0, 16)
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated") {
      if (!isDeptLeader) {
        router.replace("/admin")
        return
      }
      fetchCycles()
    }
  }, [status, isDeptLeader, router])

  async function fetchCycles() {
    setLoading(true)
    try {
      const res  = await fetch("/api/cycles")
      const data = await res.json()
      if (res.ok) setCycles(data)
      else setErrorMsg("Failed to load cycles.")
    } catch {
      setErrorMsg("Failed to load cycles.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(""); setSuccessMsg(""); setCreating(true)
    try {
      const res  = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodMonth: newMonth, periodYear: newYear, submissionDeadline: newDeadline }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || "Failed to create cycle.") }
      else {
        setCycles((prev) => [data, ...prev])
        setSuccessMsg(`Cycle for ${newMonth} ${newYear} created successfully.`)
        setShowCreate(false); setNewDeadline("")
      }
    } catch { setErrorMsg("Failed to create cycle.") }
    finally { setCreating(false) }
  }

  async function handleAdjust(cycleId: string) {
    setErrorMsg(""); setSuccessMsg(""); setAdjusting(true)
    try {
      const res  = await fetch(`/api/cycles/${cycleId}/deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionDeadline: adjustDeadline }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || "Failed to update deadline.") }
      else {
        setCycles((prev) => prev.map((c) => (c._id === cycleId ? { ...c, ...data } : c)))
        setSuccessMsg("Deadline updated successfully.")
        setAdjustingId(null); setAdjustDeadline("")
      }
    } catch { setErrorMsg("Failed to update deadline.") }
    finally { setAdjusting(false) }
  }

  async function handleClose(cycleId: string) {
    const confirmed = window.confirm(
      "Close this cycle now? Members will no longer be allowed to submit or edit entries for this cycle."
    )
    if (!confirmed) return

    setErrorMsg("")
    setSuccessMsg("")
    setClosingId(cycleId)
    try {
      const res = await fetch(`/api/cycles/${cycleId}/close`, {
        method: "PATCH",
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to close cycle.")
      } else {
        setCycles((prev) => prev.map((c) => (c._id === cycleId ? { ...c, ...data } : c)))
        setSuccessMsg("Cycle closed successfully. Submissions are now locked.")
      }
    } catch {
      setErrorMsg("Failed to close cycle.")
    } finally {
      setClosingId(null)
    }
  }

  async function handleOpen(cycle: Cycle) {
    setErrorMsg("")
    setSuccessMsg("")
    setOpeningId(cycle._id)

    try {
      const res = await fetch(`/api/cycles/${cycle._id}/open`, {
        method: "PATCH",
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to open cycle.")
      } else {
        setCycles((prev) => prev.map((c) => (c._id === cycle._id ? { ...c, ...data } : c)))
        setSuccessMsg("Cycle reopened successfully. Members can submit entries again.")
      }
    } catch {
      setErrorMsg("Failed to open cycle.")
    } finally {
      setOpeningId(null)
    }
  }

  async function handleExtend(cycleId: string) {
    setErrorMsg("")
    setSuccessMsg("")
    setExtending(true)

    try {
      const res = await fetch(`/api/cycles/${cycleId}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionDeadline: extendDeadline }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to extend deadline.")
      } else {
        setCycles((prev) => prev.map((c) => (c._id === cycleId ? { ...c, ...data } : c)))
        setSuccessMsg("Deadline extended successfully. Submissions are allowed again.")
        setExtendingId(null)
        setExtendDeadline("")
      }
    } catch {
      setErrorMsg("Failed to extend deadline.")
    } finally {
      setExtending(false)
    }
  }

  const formatDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  if (status === "loading" || (status === "authenticated" && !isDeptLeader)) return null

  return (
    <div className="dl-root">
      <style>{STYLES}</style>

      {/* ── New Cycle Modal ── */}
      {showCreate && (
        <div className="dl-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="dl-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="dl-modal-title">Create Evaluation Cycle</div>
            <form onSubmit={handleCreate}>
              <div className="dl-modal-grid">
                <div className="dl-modal-field">
                  <label className="dl-modal-label">Month</label>
                  <select
                    className="dl-select"
                    style={{ width: "100%" }}
                    value={newMonth}
                    onChange={(e) => setNewMonth(e.target.value)}
                  >
                    {MONTHS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="dl-modal-field">
                  <label className="dl-modal-label">Year</label>
                  <input
                    className="dl-input"
                    style={{ width: "100%" }}
                    type="number"
                    min={2024}
                    max={2100}
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="dl-modal-field">
                <label className="dl-modal-label">Submission Deadline</label>
                <input
                  className="dl-input"
                  style={{ width: "100%" }}
                  type="datetime-local"
                  min={minDateTime()}
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  required
                />
              </div>
              <div className="dl-modal-actions">
                <button
                  type="button"
                  className="dl-btn dl-btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dl-btn dl-btn-primary" disabled={creating}>
                  {creating ? <><span className="dl-spinner" />Creating…</> : "Create Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dl-app">
        {/* ── Sidebar ── */}
        <nav className="dl-sidebar">
          <div>
            <div className="dl-logo">
              AIESEC <span style={{ fontWeight: 400, fontSize: 14, color: "#666" }}>PM Admin</span>
            </div>
            <ul className="dl-menu">
              <li className="dl-menu-item" onClick={() => router.push("/admin?tab=dashboard")}>
                LC Dashboard
              </li>
              <li className="dl-menu-item" onClick={() => router.push("/admin?tab=members")}>
                Member Management
              </li>
              <li className="dl-menu-item" onClick={() => router.push("/admin?tab=kpi")}>
                KPI Configuration
              </li>
              <li className="dl-menu-item" onClick={() => router.push("/admin?tab=departments")}>
                Department Management
              </li>
              <li className="dl-menu-item" onClick={() => router.push("/admin?tab=announcements")}>
                Announcements
              </li>
              <li className="dl-menu-item active">
                Deadline Management
              </li>
              <li className="dl-menu-item" onClick={() => router.push("/team")}>
                Team Records
              </li>
            </ul>
          </div>
          <div>
            <div
              className="dl-menu-item"
              onClick={() => voluntaryLogout("/")}
            >
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Log Out</span>
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="dl-main">
          {/* Header */}
          <header className="dl-header">
            <div className="dl-header-search">
              <input type="text" placeholder="Search cycles…" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right", lineHeight: 1.2 }}>
              <div>{session?.user?.name ?? "—"}</div>
              <div style={{ color: "#777", fontSize: 11 }}>
                {(session?.user as any)?.department ?? "Performance Management"}
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="dl-body">
            {/* Intro */}
            <div className="dl-intro">
              <div>
                <div className="dl-date">{todayLabel}</div>
                <h1 className="dl-greeting">Deadline Management.</h1>
              </div>
              <button
                className="dl-btn dl-btn-primary"
                onClick={() => { setShowCreate(true); setErrorMsg(""); setSuccessMsg("") }}
              >
                + New Cycle
              </button>
            </div>

            {/* Alerts */}
            {successMsg && (
              <div className="dl-alert dl-alert-success">✓ {successMsg}</div>
            )}
            {errorMsg && (
              <div className="dl-alert dl-alert-error">✕ {errorMsg}</div>
            )}

            {/* Cycles list */}
            <div className="dl-card">
              <div className="dl-card-header">
                <span className="dl-card-title">Evaluation Cycles</span>
                <span style={{ fontSize: 13, color: "#777" }}>
                  {cycles.length} cycle{cycles.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="dl-empty">
                  <span className="dl-spinner" /> Loading cycles…
                </div>
              ) : cycles.length === 0 ? (
                <div className="dl-empty">No cycles yet. Create one to get started.</div>
              ) : (
                cycles.map((cycle) => (
                  <div key={cycle._id}>
                    <div className="dl-cycle-row">
                      <div>
                        <div className="dl-cycle-period">
                          {cycle.periodMonth} {cycle.periodYear}
                        </div>
                        <div className="dl-cycle-deadline">
                          Deadline: {formatDeadline(cycle.submissionDeadline)}
                        </div>
                        {!cycle.isOpen && cycle.closedAt && (
                          <div className="dl-cycle-deadline">
                            Closed on: {formatDeadline(cycle.closedAt)}
                          </div>
                        )}
                        {cycle.isArchived && cycle.archivedAt && (
                          <div className="dl-cycle-deadline">
                            Archived on: {formatDeadline(cycle.archivedAt)}
                          </div>
                        )}
                      </div>
                      <div className="dl-actions">
                        <span className={`dl-pill ${cycle.isArchived ? "dl-pill-archived" : cycle.isOpen ? "dl-pill-open" : "dl-pill-closed"}`}>
                          {cycle.isArchived ? "Archived" : cycle.isOpen ? "Open" : "Closed"}
                        </span>
                        {cycle.isOpen && (
                          <button
                            className="dl-btn"
                            style={{
                              fontSize: 13,
                              padding: "7px 14px",
                              background: "var(--danger-red)",
                              color: "#fff",
                            }}
                            disabled={closingId === cycle._id}
                            onClick={() => handleClose(cycle._id)}
                          >
                            {closingId === cycle._id ? <><span className="dl-spinner" />Closing…</> : "Close Cycle"}
                          </button>
                        )}
                        {!cycle.isOpen && !!cycle.isManuallyClosed && !cycle.isPastPeriod && (
                          <button
                            className="dl-btn"
                            style={{
                              fontSize: 13,
                              padding: "7px 14px",
                              background: "var(--success-green)",
                              color: "#fff",
                            }}
                            disabled={openingId === cycle._id}
                            onClick={() => handleOpen(cycle)}
                          >
                            {openingId === cycle._id ? <><span className="dl-spinner" />Opening…</> : "Open Cycle"}
                          </button>
                        )}
                        {!!cycle.canExtend && (
                          <button
                            className="dl-btn"
                            style={{
                              fontSize: 13,
                              padding: "7px 14px",
                              background: "var(--warning-yellow)",
                              color: "#fff",
                            }}
                            onClick={() => {
                              setExtendingId(cycle._id)
                              setExtendDeadline("")
                              setErrorMsg("")
                              setSuccessMsg("")
                            }}
                          >
                            Extend Deadline
                          </button>
                        )}
                        {cycle.isOpen && (
                          <button
                            className="dl-btn dl-btn-secondary"
                            style={{ fontSize: 13, padding: "7px 14px" }}
                            onClick={() => {
                              setAdjustingId(cycle._id)
                              setAdjustDeadline("")
                              setErrorMsg(""); setSuccessMsg("")
                            }}
                          >
                            Adjust Deadline
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline adjust form */}
                    {adjustingId === cycle._id && (
                      <div style={{ padding: "16px 24px", background: "#f9fafb", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "flex-end", gap: 12 }}>
                        <div>
                          <label className="dl-form-label">New Deadline (must be a future date)</label>
                          <input
                            className="dl-input"
                            type="datetime-local"
                            min={minDateTime()}
                            value={adjustDeadline}
                            onChange={(e) => setAdjustDeadline(e.target.value)}
                          />
                        </div>
                        <button
                          className="dl-btn dl-btn-primary"
                          onClick={() => handleAdjust(cycle._id)}
                          disabled={adjusting || !adjustDeadline}
                        >
                          {adjusting ? <><span className="dl-spinner" />Saving…</> : "Save"}
                        </button>
                        <button
                          className="dl-btn dl-btn-secondary"
                          onClick={() => { setAdjustingId(null); setAdjustDeadline("") }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Inline extend form */}
                    {extendingId === cycle._id && (
                      <div style={{ padding: "16px 24px", background: "#fff7ed", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "flex-end", gap: 12 }}>
                        <div>
                          <label className="dl-form-label">Extended Deadline (future date required)</label>
                          <input
                            className="dl-input"
                            type="datetime-local"
                            min={minDateTime()}
                            value={extendDeadline}
                            onChange={(e) => setExtendDeadline(e.target.value)}
                          />
                        </div>
                        <button
                          className="dl-btn"
                          style={{ background: "var(--warning-yellow)", color: "#fff" }}
                          onClick={() => handleExtend(cycle._id)}
                          disabled={extending || !extendDeadline}
                        >
                          {extending ? <><span className="dl-spinner" />Saving…</> : "Save Extension"}
                        </button>
                        <button
                          className="dl-btn dl-btn-secondary"
                          onClick={() => { setExtendingId(null); setExtendDeadline("") }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
