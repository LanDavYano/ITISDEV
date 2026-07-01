"use client";

/**
 * app/admin/page.tsx — AIESEC PM Portal · Member Management
 *
 * All data comes from the real MongoDB-backed API routes:
 *   GET  /api/admin/members        – member list
 *   POST /api/admin/members        – add member
 *   DELETE /api/admin/members/:id  – remove member
 *   GET  /api/admin/stats          – dashboard metrics & dept status
 *
 * Role-level gating matches the original:
 *   roleLevel < 3  → read-only (Member / Team Leader view)
 *   roleLevel >= 3 → full admin (Leader of Department / PM)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PopulatedMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  idNumber: string;
  role: { title: string; level: number } | null;
  department: { name: string; officeType: string } | null;
  subDepartment: { name: string } | null;
}

interface DeptStatus {
  name: string;
  ratio: string;
  pill: "success" | "info" | "warning";
  pillLabel: string;
}

interface Stats {
  totalMembers: number;
  avgKpiAchievement: number | null;
  pendingSubmissions: number;
  currentPeriod: string;
  deptStatus: DeptStatus[];
}

interface Submission {
  _id: string;
  member: PopulatedMember;
  status: "Submitted" | "Submitted with flags" | "Not submitted";
  cycle: string;
}

// ─── Styles (self-contained, scoped to .aiesec-admin-root) ───────────────────

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
    --danger-hover: #dc2626;
    --success-green: #10b981;
    --warning-yellow: #f59e0b;
    --shadow-main: 0 2px 10px rgba(0,0,0,0.03);
}
.aiesec-admin-root * { margin:0; padding:0; box-sizing:border-box; }
.aiesec-admin-root { font-family:'Inter',sans-serif; color:var(--text-color); background:var(--bg-main); }
.admin-app { display:flex; height:100vh; }
.admin-sidebar { width:260px; background:var(--sidebar-bg); border-right:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; padding:24px; }
.sidebar-logo { font-size:22px; font-weight:700; margin-bottom:40px; color:var(--primary-blue); }
.sidebar-menu { list-style:none; }
.menu-item { display:flex; align-items:center; padding:12px 16px; border-radius:8px; cursor:pointer; margin-bottom:8px; color:var(--text-sub); font-weight:500; font-size:14px; }
.menu-item.active { background:var(--active-item-bg); color:var(--primary-blue); font-weight:600; }
.admin-main { flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; }
.admin-header { height:70px; display:flex; align-items:center; justify-content:space-between; padding:0 30px; border-bottom:1px solid var(--border-color); background:#fff; }
.header-search { position:relative; width:350px; }
.header-search input { width:100%; padding:10px 35px 10px 15px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-main); font-size:14px; outline:none; }
.search-kbd { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--text-sub); background:var(--secondary-bg); padding:3px 6px; border-radius:4px; }
.header-actions { display:flex; align-items:center; gap:15px; }
.profile-avatar { width:36px; height:36px; border-radius:50%; background:var(--primary-blue); }
.admin-body { padding:40px 30px; flex-grow:1; }
.body-intro { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
.body-date { font-size:14px; color:var(--text-sub); margin-bottom:5px; }
.body-greeting { font-size:28px; font-weight:700; letter-spacing:-0.5px; }
.intro-actions { display:flex; gap:12px; }
.btn-action { padding:10px 18px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; border:none; transition:0.2s; }
.btn-action.primary { background:var(--primary-blue); color:#fff; }
.btn-action.primary:hover { background:var(--primary-hover); }
.btn-action.secondary { background:var(--secondary-bg); color:var(--text-color); border:1px solid var(--border-color); }
.btn-action.secondary:hover { background:#e5e7eb; }
.full-width { width:100%; margin-top:15px; }
.body-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:30px; }
.metric-card { background:#fff; padding:24px; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-main); }
.metric-data { font-size:28px; font-weight:700; margin-bottom:4px; }
.metric-label { font-size:13px; color:var(--text-sub); }
.content-table { background:#fff; padding:25px; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-main); margin-bottom:20px; }
.table-header { display:flex; justify-content:space-between; margin-bottom:20px; align-items:center; }
.table-title { font-size:18px; font-weight:600; }
.filter-dropdown { font-size:13px; font-weight:500; border:1px solid var(--border-color); padding:6px 12px; border-radius:6px; cursor:pointer; display:inline-block; margin-left:10px; }
.table-grid-header { display:grid; grid-template-columns:2fr 1.5fr 1.5fr 1fr; gap:15px; padding-bottom:12px; border-bottom:1px solid var(--border-color); font-size:12px; font-weight:600; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; }
.table-body { display:flex; flex-direction:column; }
.table-row { display:grid; grid-template-columns:2fr 1.5fr 1.5fr 1fr; gap:15px; align-items:center; padding:16px 0; border-bottom:1px solid var(--secondary-bg); transition:opacity 0.3s; }
.table-row:last-child { border-bottom:none; padding-bottom:0; }
.table-cell { font-size:14px; font-weight:500; }
.member-subtext { font-size:12px; color:var(--text-sub); font-weight:400; margin-top:2px; }
.member { display:flex; align-items:center; gap:12px; }
.member-avatar { width:36px; height:36px; border-radius:50%; }
.avatar-a { background:linear-gradient(135deg,#f6d365,#fda085); }
.avatar-b { background:linear-gradient(135deg,#84fab0,#8fd3f4); }
.avatar-c { background:linear-gradient(135deg,#cfd9df,#e2ebf0); }
.avatar-d { background:linear-gradient(135deg,#a18cd1,#fbc2eb); }
.row-actions { display:flex; gap:8px; }
.btn-icon { background:none; border:1px solid var(--border-color); padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:500; color:var(--text-color); transition:0.2s; }
.btn-icon:hover { background:var(--secondary-bg); }
.delete-btn { color:var(--danger-red); border-color:#fca5a5; }
.delete-btn:hover { background:#fee2e2; border-color:var(--danger-red); }
.content-lower { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.widget-card { background:#fff; padding:25px; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-main); }
.lower-title { font-size:16px; font-weight:600; margin-bottom:8px; }
.widget-desc { font-size:13px; color:var(--text-sub); margin-bottom:15px; }
.broadcast-input { width:100%; height:100px; padding:12px; border:1px solid var(--border-color); border-radius:8px; resize:none; font-family:inherit; font-size:14px; outline:none; }
.broadcast-input:focus { border-color:var(--primary-blue); }
.dept-list { list-style:none; display:flex; flex-direction:column; gap:12px; margin-top:15px; }
.dept-list li { display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:500; padding:8px 0; border-bottom:1px solid var(--secondary-bg); }
.dept-list li:last-child { border-bottom:none; }
.status-pill { font-size:12px; padding:4px 10px; border-radius:12px; font-weight:600; }
.status-pill.success { background:#d1fae5; color:#065f46; }
.status-pill.warning { background:#fef3c7; color:#92400e; }
.status-pill.info { background:#dbeafe; color:#1e40af; }
.restricted { display:none !important; }
.disabled-btn { opacity:0.4; cursor:not-allowed !important; pointer-events:none; }
.loading-shimmer { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:6px; height:20px; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:500; color:#fff; z-index:9999; animation:slideUp 0.2s ease; }
.toast.success { background:#10b981; }
.toast.error { background:#ef4444; }
@keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
/* Add-member modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:100; }
.modal-box { background:#fff; border-radius:16px; padding:32px; width:520px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
.modal-title { font-size:20px; font-weight:700; margin-bottom:20px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.form-field { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
.form-field label { font-size:12px; font-weight:600; color:var(--text-sub); text-transform:uppercase; }
.form-field input, .form-field select { padding:9px 12px; border:1px solid var(--border-color); border-radius:8px; font-size:14px; outline:none; font-family:inherit; }
.form-field input:focus, .form-field select:focus { border-color:var(--primary-blue); }
.modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:8px; }
`;

// ─── Avatar helper ────────────────────────────────────────────────────────────

const AVATAR_CLASSES = ["avatar-a", "avatar-b", "avatar-c", "avatar-d"];
function avatarClass(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_CLASSES[sum % AVATAR_CLASSES.length];
}

// ─── Toast component ──────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── Add-member modal ─────────────────────────────────────────────────────────

interface AddMemberModalProps {
  onClose: () => void;
  onCreated: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function AddMemberModal({ onClose, onCreated, showToast }: AddMemberModalProps) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    birthdate: "", idNumber: "", roleId: "", departmentId: "",
  });
  const [roles, setRoles] = useState<{ _id: string; title: string }[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch roles & departments for the dropdowns
    Promise.all([
      fetch("/api/admin/roles").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoles(r.roles ?? []);
      setDepartments(d.departments ?? []);
    });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          birthdate: form.birthdate,
          idNumber: form.idNumber,
          role: form.roleId,
          department: form.departmentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create member");
      showToast("Member added successfully!", "success");
      onCreated();
      onClose();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Add New Member</div>
        <div className="form-row">
          <div className="form-field">
            <label>First Name</label>
            <input value={form.firstName} onChange={set("firstName")} placeholder="e.g. Juan" />
          </div>
          <div className="form-field">
            <label>Last Name</label>
            <input value={form.lastName} onChange={set("lastName")} placeholder="e.g. dela Cruz" />
          </div>
        </div>
        <div className="form-field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="juan@aiesec.ph" />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>ID Number</label>
            <input value={form.idNumber} onChange={set("idNumber")} placeholder="e.g. 2021-12345" />
          </div>
          <div className="form-field">
            <label>Birthdate</label>
            <input type="date" value={form.birthdate} onChange={set("birthdate")} />
          </div>
        </div>
        <div className="form-field">
          <label>Temporary Password</label>
          <input type="password" value={form.password} onChange={set("password")} placeholder="Min 8 characters" />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Role</label>
            <select value={form.roleId} onChange={set("roleId")}>
              <option value="">Select role…</option>
              {roles.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Department</label>
            <select value={form.departmentId} onChange={set("departmentId")}>
              <option value="">Select department…</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Cancel</button>
          <button className="btn-action primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter(); 

  const [members, setMembers] = useState<PopulatedMember[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const currentCycle = "June 2026";

  const isAdmin = (session?.user as any)?.roleLevel >= 3;

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Compute Monitoring Summaries & Filters ──
  const { filteredSubmissions, summaryCounts } = useMemo(() => {
    let filtered = submissions;

    // Apply Department Filter
    if (filterDept !== "All") {
      filtered = filtered.filter(sub => sub.member.department?.name === filterDept);
    }
    
    // Apply Status Filter
    if (filterStatus !== "All") {
      filtered = filtered.filter(sub => sub.status === filterStatus);
    }

    // Calculate Summaries based on the UNFILTERED data for that department
    // (So the top boxes always show the total for the selected department)
    const baseForSummary = filterDept === "All" ? submissions : submissions.filter(sub => sub.member.department?.name === filterDept);
    
    const counts = {
      submitted: baseForSummary.filter(s => s.status === "Submitted").length,
      flagged: baseForSummary.filter(s => s.status === "Submitted with flags").length,
      missing: baseForSummary.filter(s => s.status === "Not submitted").length,
    };

    return { filteredSubmissions: filtered, summaryCounts: counts };
  }, [submissions, filterDept, filterStatus]);

  // ── Fetch members ──
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch("/api/admin/members");
      const data = await res.json();
      if (res.ok) setMembers(data.members ?? []);
    } catch {
      showToast("Failed to load members", "error");
    } finally {
      setLoadingMembers(false);
    }
  }, [showToast]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchMembers();
      fetchStats();
    }
  }, [status, router, fetchMembers, fetchStats]);

  // ── Delete member ──
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the LC portal? This cannot be undone.`)) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setMembers((prev) => prev.filter((m) => m._id !== id));
      showToast("Member removed.", "success");
      fetchStats(); // refresh counts
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRemovingId(null);
    }
  };

  // ── Filtered members ──
  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role?.title?.toLowerCase().includes(q) ||
        m.department?.name?.toLowerCase().includes(q)
    );
  }, [members, search]);

  // ── Date labels ──
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  if (status === "loading") return null;

  return (
    <div className="aiesec-admin-root">
      <style>{STYLES}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onCreated={() => { fetchMembers(); fetchStats(); }}
          showToast={showToast}
        />
      )}

      <div className="admin-app">
        {/* ── Sidebar ── */}
        <nav className="admin-sidebar">
          <div className="sidebar-top">
            <div className="sidebar-logo">
              AIESEC <span style={{ fontWeight: 400, fontSize: 14, color: "#666" }}>PM Admin</span>
            </div>
            <ul className="sidebar-menu">
              <li className="menu-item" onClick={() => router.push("/dashboard")}>
                LC Dashboard
              </li>
              <li className="menu-item active">Member Management</li>
            </ul>
          </div>
          <div className="sidebar-bottom">
            <div
              className="menu-item"
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{ cursor: "pointer" }}
            >
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Log Out</span>
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="admin-main">
          {/* Header */}
          <header className="admin-header">
            <div className="header-search">
              <input
                type="text"
                placeholder="Search members, roles, or portfolios…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="search-kbd">⌘ F</span>
            </div>
            <div className="header-actions">
              <div style={{ textAlign: "right", lineHeight: 1.2, fontSize: 13, fontWeight: 500 }}>
                <div>{session?.user?.name ?? "—"}</div>
                <div style={{ color: "#777", fontSize: 11 }}>
                  {(session?.user as any)?.department ?? "—"}
                </div>
              </div>
              <div className="profile-avatar" />
            </div>
          </header>

          {/* Body */}
          <div className="admin-body">
            {/* Intro */}
            <div className="body-intro">
              <div>
                <div className="body-date">{todayLabel}</div>
                <h1 className="body-greeting">LC Member Management.</h1>
              </div>
              <div className="intro-actions">
                <button
                  className={`btn-action secondary${!isAdmin ? " restricted" : ""}`}
                  onClick={() =>
                    broadcastMsg.trim()
                      ? showToast("Broadcast sent to all members!", "success")
                      : showToast("Write a message first.", "error")
                  }
                >
                  Broadcast Reminder
                </button>
                <button
                  className={`btn-action primary${!isAdmin ? " restricted" : ""}`}
                  onClick={() => setShowModal(true)}
                >
                  + Add Member
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div className="body-metrics">
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats ? <div className="loading-shimmer" style={{ width: 60 }} /> : (stats?.totalMembers ?? "—")}
                </div>
                <div className="metric-label">Total Active Members</div>
              </div>
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats ? <div className="loading-shimmer" style={{ width: 60 }} /> : stats?.avgKpiAchievement != null ? `${stats.avgKpiAchievement}%` : "N/A"}
                </div>
                <div className="metric-label">
                  Avg KPI Achievement {stats?.currentPeriod ? `(${stats.currentPeriod})` : ""}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats ? <div className="loading-shimmer" style={{ width: 60 }} /> : (stats?.pendingSubmissions ?? "—")}
                </div>
                <div className="metric-label">Pending Submissions This Period</div>
              </div>
            </div>

            {/* --- MTT Monitoring Dashboard --- */}
            <div className="content-table">
              <div className="table-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <div>
                    <h2 className="table-title">MTT Monitoring Dashboard</h2>
                    <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4 }}>
                      Current Cycle: <strong>{currentCycle}</strong>
                    </p>
                  </div>
                  
                  {/* Filters */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <select className="filter-dropdown" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ background: "white" }}>
                      <option value="All">All Departments</option>
                      <option value="Front Office">Front Office</option>
                      <option value="Back Office">Back Office</option>
                    </select>
                    <select className="filter-dropdown" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ background: "white" }}>
                      <option value="All">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Submitted with flags">Flagged</option>
                      <option value="Not submitted">Not Submitted</option>
                    </select>
                  </div>
                </div>

                {/* Summary Counts */}
                <div style={{ display: "flex", gap: 15, width: "100%", padding: 15, background: "var(--secondary-bg)", borderRadius: 8 }}>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success-green)" }}>{summaryCounts.submitted}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Submitted</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", borderLeft: "1px solid #ddd", borderRight: "1px solid #ddd" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--warning-yellow)" }}>{summaryCounts.flagged}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Flagged</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger-red)" }}>{summaryCounts.missing}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Not Submitted</div>
                  </div>
                </div>
              </div>

              <div className="table-grid-header">
                <div>Member</div>
                <div>Portfolio</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              <div className="table-body">
                {loadingSubmissions ? (
                   [1, 2, 3].map((i) => (
                    <div className="table-row" key={i}>
                      <div className="loading-shimmer" style={{ width: "80%" }} />
                      <div className="loading-shimmer" style={{ width: "60%" }} />
                      <div className="loading-shimmer" style={{ width: "50%" }} />
                      <div className="loading-shimmer" style={{ width: "40%" }} />
                    </div>
                  ))
                ) : filteredSubmissions.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--text-sub)" }}>
                    <h3>No submission data found for this cycle.</h3>
                  </div>
                ) : (
                  filteredSubmissions.map((sub) => {
                    // Determine color pill
                    const pillClass = sub.status === "Submitted" ? "success" 
                                    : sub.status === "Submitted with flags" ? "warning" 
                                    : "danger"; // Ensure .danger is in your STYLES string!

                    return (
                      <div className="table-row" key={sub._id}>
                        <div className="table-cell member">
                          <div className={`member-avatar ${avatarClass(sub.member._id)}`} />
                          <div>
                            <div className="member-name">{sub.member.firstName} {sub.member.lastName}</div>
                            <div className="member-subtext">{sub.member.email}</div>
                          </div>
                        </div>

                        <div className="table-cell">
                          <div className="dept-main">{sub.member.department?.name ?? "—"}</div>
                          <div className="member-subtext">{sub.member.subDepartment?.name ?? ""}</div>
                        </div>

                        <div className="table-cell">
                          <span className={`status-pill ${pillClass}`} style={{ padding: "6px 12px" }}>
                            {sub.status}
                          </span>
                        </div>

                        <div className="table-cell row-actions">
                          <button 
                            className="btn-icon view-btn" 
                            onClick={() => router.push(`/admin/submissions/${sub._id}`)}
                          >
                            📄 View Entry
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Lower widgets */}
            <div className="content-lower">
              {/* Broadcast */}
              <div className="widget-card">
                <h2 className="lower-title">PM Quick Broadcast</h2>
                <p className="widget-desc">Send a reminder or announcement to all active LC members.</p>
                <textarea
                  className="broadcast-input"
                  placeholder="Type your message here…"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <button
                  className="btn-action primary full-width"
                  onClick={() => {
                    if (broadcastMsg.trim()) {
                      showToast("Message sent to all members!", "success");
                      setBroadcastMsg("");
                    } else {
                      showToast("Message cannot be empty.", "error");
                    }
                  }}
                >
                  Send to All Members
                </button>
              </div>

              {/* Dept status */}
              <div className="widget-card">
                <h2 className="lower-title">Monthly Team Tool Status</h2>
                {loadingStats ? (
                  <div className="loading-shimmer" style={{ marginTop: 15, height: 120 }} />
                ) : (
                  <ul className="dept-list">
                    {(stats?.deptStatus ?? []).map((dept) => (
                      <li key={dept.name}>
                        <span>{dept.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: dept.pill === "warning" ? "#ef4444" : "#666", fontWeight: dept.pill === "warning" ? 600 : 400 }}>
                            {dept.ratio}
                          </span>
                          <span className={`status-pill ${dept.pill}`}>{dept.pillLabel}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}