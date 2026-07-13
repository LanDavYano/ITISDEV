"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { voluntaryLogout } from "@/lib/logout";
import AnnouncementsModal from "@/components/announcements-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PopulatedMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  idNumber: string;
  role: { _id?: string; title: string; level: number } | null;
  department: { _id?: string; name: string; officeType: string } | null;
  subDepartment: { _id?: string; name: string } | null;
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

interface Cycle {
  _id: string;
  periodMonth: string;
  periodYear: number;
  submissionDeadline: string;
  isOpen: boolean;
}

interface KpiBreakdownEntry {
  kpiId: string;
  name: string;
  source: "rating" | "attendance" | "deliverables" | "timeliness" | "manual";
  weight: number;
  rawValue: number | null;
  normalizedScore: number | null;
  weightedContribution: number;
  status: "ok" | "missing-excluded" | "missing-flagged" | "missing-defaulted" | "below-cutoff";
}

interface PerfSummary {
  personalRating: number | null;
  professionalRating: number | null;
  deliverablesAssigned: number;
  deliverablesAnswered: number;
  meetingsTotal: number;
  meetingsAttended: number;
  finalScore: number | null;
  eligible: boolean;
  submissionStatus: "Submitted" | "Submitted with flags" | "Not submitted";
  breakdown: KpiBreakdownEntry[];
  flags: string[];
}

interface Submission {
  _id: string;
  member: PopulatedMember;
  status: "Submitted" | "Submitted with flags" | "Not submitted";
  cycle: string;
}

interface AnnouncementItem {
  _id: string;
  title: string;
  content: string;
  postedAt: string;
  expiresAt: string | null;
  status?: "Active" | "Expired" | "Deleted";
  createdByName: string;
  isDeleted?: boolean;
}

interface AnnouncementLogItem {
  _id: string;
  titleSnapshot: string;
  action: "create" | "edit" | "delete";
  changes: { field: string; from: unknown; to: unknown }[];
  actorName: string;
  actorRole: string | null;
  createdAt: string;
}

interface KpiItem {
  _id?: string;
  name: string;
  weight: number;
}

interface DepartmentItem {
  _id: string;
  name: string;
  officeType: "Front Office" | "Back Office";
  description: string;
  memberCapacity: number | null;
  memberCount: number;
  subDepartmentCount: number;
  deptLeader: { _id: string; firstName: string; lastName: string } | null;
}

interface SubDepartmentItem {
  _id: string;
  name: string;
  department: { _id: string; name: string } | null;
  description: string;
  memberCapacity: number | null;
  memberCount: number;
  subDeptLeader: { _id: string; firstName: string; lastName: string } | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
.admin-sidebar { width:260px; background:var(--sidebar-bg); border-right:1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; padding:24px; flex-shrink:0; }
.sidebar-logo { font-size:22px; font-weight:700; margin-bottom:40px; color:var(--primary-blue); }
.sidebar-menu { list-style:none; }
.menu-item { display:flex; align-items:center; padding:12px 16px; border-radius:8px; cursor:pointer; margin-bottom:8px; color:var(--text-sub); font-weight:500; font-size:14px; transition:background 0.15s; }
.menu-item:hover { background:var(--secondary-bg); color:var(--text-color); }
.menu-item.active { background:var(--active-item-bg); color:var(--primary-blue); font-weight:600; }
.admin-main { flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; }
.admin-header { height:70px; display:flex; align-items:center; justify-content:space-between; padding:0 30px; border-bottom:1px solid var(--border-color); background:#fff; flex-shrink:0; }
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
.filter-dropdown { font-size:13px; font-weight:500; border:1px solid var(--border-color); padding:6px 12px; border-radius:6px; cursor:pointer; display:inline-block; margin-left:10px; color:var(--text-color); background:#fff; }
.table-grid-header { display:grid; grid-template-columns:2fr 1.5fr 1fr 1.5fr 1.5fr 1fr; gap:15px; padding-bottom:12px; border-bottom:1px solid var(--border-color); font-size:12px; font-weight:600; color:var(--text-sub); text-transform:uppercase; letter-spacing:0.5px; }
.table-body { display:flex; flex-direction:column; }
.table-row-6 { display:grid; grid-template-columns:2fr 1.5fr 1fr 1.5fr 1.5fr 1fr; gap:15px; align-items:center; padding:16px 0; border-bottom:1px solid var(--secondary-bg); transition:opacity 0.3s; }
.table-row-6:last-child { border-bottom:none; padding-bottom:0; }
.table-cell { font-size:14px; font-weight:500; min-width:0; }
.member-subtext { font-size:12px; color:var(--text-sub); font-weight:400; margin-top:2px; }
.member { display:flex; align-items:center; gap:12px; }
.member-avatar { width:36px; height:36px; border-radius:50%; flex-shrink:0; }
.avatar-a { background:linear-gradient(135deg,#f6d365,#fda085); }
.avatar-b { background:linear-gradient(135deg,#84fab0,#8fd3f4); }
.avatar-c { background:linear-gradient(135deg,#cfd9df,#e2ebf0); }
.avatar-d { background:linear-gradient(135deg,#a18cd1,#fbc2eb); }
.perf { display:flex; align-items:center; gap:8px; }
.perf-bar-bg { flex-grow:1; height:6px; background:var(--secondary-bg); border-radius:4px; overflow:hidden; min-width:30px; }
.perf-bar-fill { height:100%; border-radius:4px; }
.perf-bar-fill.excellent { background:var(--success-green); }
.perf-bar-fill.warning { background:var(--warning-yellow); }
.perf-bar-fill.danger { background:var(--danger-red); }
.perf-score { font-size:12px; font-weight:600; min-width:32px; flex-shrink:0; }
.row-actions { display:flex; gap:6px; flex-wrap:wrap; }
.btn-icon { background:none; border:1px solid var(--border-color); padding:5px 9px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:500; color:var(--text-color); transition:0.2s; white-space:nowrap; }
.btn-icon:hover { background:var(--secondary-bg); }
.delete-btn { color:var(--danger-red); border-color:#fca5a5; }
.delete-btn:hover { background:#fee2e2; border-color:var(--danger-red); }
.content-lower { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.widget-card { background:#fff; padding:25px; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-main); }
.lower-title { font-size:16px; font-weight:600; margin-bottom:8px; }
.widget-desc { font-size:13px; color:var(--text-sub); margin-bottom:15px; }
.broadcast-input { width:100%; height:100px; padding:12px; border:1px solid var(--border-color); border-radius:8px; resize:none; font-family:inherit; font-size:14px; outline:none; }
.broadcast-input:focus { border-color:var(--primary-blue); }
.dept-list { list-style:none; display:flex; flex-direction:column; gap:0; margin-top:15px; }
.dept-list li { display:flex; justify-content:space-between; align-items:center; font-size:14px; font-weight:500; padding:10px 0; border-bottom:1px solid var(--secondary-bg); }
.dept-list li:last-child { border-bottom:none; }
.status-pill { font-size:12px; padding:4px 10px; border-radius:12px; font-weight:600; }
.status-pill.success { background:#d1fae5; color:#065f46; }
.status-pill.warning { background:#fef3c7; color:#92400e; }
.status-pill.info { background:#dbeafe; color:#1e40af; }
.status-pill.danger { background:#fee2e2; color:#991b1b; }
.restricted { display:none !important; }
.disabled-btn { opacity:0.4; cursor:not-allowed !important; pointer-events:none; }
.loading-shimmer { background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:200% 100%; animation:shimmer 1.2s infinite; border-radius:6px; height:20px; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:500; color:#fff; z-index:9999; animation:slideUp 0.2s ease; }
.toast.success { background:#10b981; }
.toast.error { background:#ef4444; }
@keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:100; }
.modal-box { background:#fff; border-radius:16px; padding:32px; width:520px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
.modal-title { font-size:20px; font-weight:700; margin-bottom:20px; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }
.form-field { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
.form-field label { font-size:12px; font-weight:600; color:var(--text-sub); text-transform:uppercase; }
.form-field input, .form-field select, .form-field textarea { padding:9px 12px; border:1px solid var(--border-color); border-radius:8px; font-size:14px; outline:none; font-family:inherit; }
.form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color:var(--primary-blue); }
.form-field textarea { resize:vertical; min-height:90px; }
.modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:8px; }
.dept-status-row { display:flex; align-items:center; justify-content:space-between; padding:12px 4px; border-bottom:1px solid var(--secondary-bg); }
.dept-status-row:last-child { border-bottom:none; }
`;

// ─── PerfBar ──────────────────────────────────────────────────────────────────

function PerfBar({ perf, onShowBreakdown }: { perf: PerfSummary | undefined; onShowBreakdown?: () => void }) {
  if (!perf) return <span style={{ color: "#ccc", fontSize: 13 }}>No submission</span>;

  const score = perf.finalScore;

  // null = no KPIs could be scored at all (e.g. not submitted and every
  // KPI is set to "exclude" on missing data). Distinct from 0%, which is a
  // real, computed low score and should still show as a real score.
  if (score === null) {
    return <span style={{ color: "red", fontSize: 13 }}>Incomplete</span>;
  }

  const fillClass = score >= 70 ? "excellent" : score >= 40 ? "warning" : "danger";

  return (
    <div
      className="perf"
      onClick={onShowBreakdown}
      style={{ cursor: onShowBreakdown ? "pointer" : "default" }}
      title="Click to view KPI breakdown"
    >
      <div className="perf-bar-bg">
        <div className={`perf-bar-fill ${fillClass}`} style={{ width: `${score}%` }} />
      </div>
      <span className="perf-score">{score}%</span>
      {!perf.eligible && (
        <span style={{ color: "var(--warning-yellow)", fontSize: 12 }} title={perf.flags.join("; ")}>
          {" "}⚠
        </span>
      )}
    </div>
  );
}

// ─── KPI Breakdown Modal ────────────────────────────────────────────────────

function KpiBreakdownModal({
  memberName,
  perf,
  onClose,
}: {
  memberName: string;
  perf: PerfSummary;
  onClose: () => void;
}) {
  const statusLabel: Record<KpiBreakdownEntry["status"], string> = {
    ok: "OK",
    "missing-excluded": "Missing (excluded)",
    "missing-flagged": "Missing (flagged)",
    "missing-defaulted": "Missing (defaulted)",
    "below-cutoff": "Below cutoff",
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{memberName} — score breakdown</div>
        <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 16 }}>
          Final score: <strong>{perf.finalScore ?? "—"}%</strong>{" "}
          {!perf.eligible && <span style={{ color: "var(--warning-yellow)" }}>(ineligible)</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.4fr", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border-color)", fontSize: 11, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase" }}>
          <div>KPI</div>
          <div>Weight</div>
          <div>Raw</div>
          <div>Normalized</div>
          <div>Status</div>
        </div>

        {perf.breakdown.map((entry) => (
          <div key={entry.kpiId} style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.4fr", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--secondary-bg)", fontSize: 13, alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>
              {entry.name}
              <div className="member-subtext">{entry.source}</div>
            </div>
            <div>{entry.weight}%</div>
            <div>{entry.rawValue ?? "—"}</div>
            <div>{entry.normalizedScore ?? "—"}{entry.normalizedScore != null ? "%" : ""}</div>
            <div style={{ color: entry.status === "ok" ? "var(--success-green)" : "var(--warning-yellow)" }}>
              {statusLabel[entry.status]}
            </div>
          </div>
        ))}

        {perf.flags.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Flags</div>
            <ul style={{ paddingLeft: 18, color: "var(--text-sub)" }}>
              {perf.flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

const AVATAR_CLASSES = ["avatar-a", "avatar-b", "avatar-c", "avatar-d"];
function avatarClass(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_CLASSES[sum % AVATAR_CLASSES.length];
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── AddMemberModal ───────────────────────────────────────────────────────────

interface AddMemberModalProps {
  onClose: () => void;
  onCreated: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function AddMemberModal({ onClose, onCreated, showToast }: AddMemberModalProps) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    birthdate: "", idNumber: "", roleId: "", departmentId: "", subDepartmentId: "",
  });
  const [roles, setRoles] = useState<{ _id: string; title: string }[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [subDepartments, setSubDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/roles").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoles(r.roles ?? []);
      setDepartments(d.departments ?? []);
    });
  }, []);

  useEffect(() => {
    if (!form.departmentId) {
      setSubDepartments([]);
      return;
    }

    fetch(`/api/admin/sub-departments?departmentId=${form.departmentId}`)
      .then((r) => r.json())
      .then((data) => setSubDepartments(data.subDepartments ?? []))
      .catch(() => setSubDepartments([]));
  }, [form.departmentId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => {
      if (k === "departmentId") {
        return { ...f, departmentId: value, subDepartmentId: "" };
      }
      return { ...f, [k]: value };
    });
  };

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
          subDepartment: form.subDepartmentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create member");
      showToast("Member added successfully!", "success");
      onCreated();
      onClose();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
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
        <div className="form-field">
          <label>Sub-Department</label>
          <select
            value={form.subDepartmentId}
            onChange={set("subDepartmentId")}
            disabled={!form.departmentId}
          >
            <option value="">Select sub-department…</option>
            {subDepartments.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
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

// ─── EditMemberModal ──────────────────────────────────────────────────────────

interface EditMemberModalProps {
  member: PopulatedMember;
  onClose: () => void;
  onUpdated: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function EditMemberModal({ member, onClose, onUpdated, showToast }: EditMemberModalProps) {
  const memberAny = member as any;
  const [form, setForm] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    roleId: memberAny.role?._id ?? "",
    departmentId: memberAny.department?._id ?? "",
    subDepartmentId: memberAny.subDepartment?._id ?? "",
  });
  const [roles, setRoles] = useState<{ _id: string; title: string }[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [subDepartments, setSubDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/roles").then((r) => r.json()),
      fetch("/api/admin/departments").then((r) => r.json()),
    ]).then(([r, d]) => {
      setRoles(r.roles ?? []);
      setDepartments(d.departments ?? []);
    });
  }, []);

  useEffect(() => {
    if (!form.departmentId) {
      setSubDepartments([]);
      return;
    }

    fetch(`/api/admin/sub-departments?departmentId=${form.departmentId}`)
      .then((r) => r.json())
      .then((data) => setSubDepartments(data.subDepartments ?? []))
      .catch(() => setSubDepartments([]));
  }, [form.departmentId]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((f) => {
      if (k === "departmentId") {
        return { ...f, departmentId: value, subDepartmentId: "" };
      }
      return { ...f, [k]: value };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
      };
      const currentRoleId = memberAny.role?._id ?? "";
      const currentDeptId = memberAny.department?._id ?? "";
      const currentSubDeptId = memberAny.subDepartment?._id ?? "";
      if (form.roleId && form.roleId !== currentRoleId) updateData.role = form.roleId;
      if (form.departmentId && form.departmentId !== currentDeptId) updateData.department = form.departmentId;
      if (form.subDepartmentId !== currentSubDeptId) {
        updateData.subDepartment = form.subDepartmentId || null;
      }

      const res = await fetch(`/api/admin/members/${member._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update member");
      showToast("Member updated successfully!", "success");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Member</div>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 12, color: "var(--text-sub)", marginBottom: 4 }}>{member.email}</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{member.firstName} {member.lastName}</div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>First Name</label>
            <input value={form.firstName} onChange={set("firstName")} />
          </div>
          <div className="form-field">
            <label>Last Name</label>
            <input value={form.lastName} onChange={set("lastName")} />
          </div>
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
        <div className="form-field">
          <label>Sub-Department</label>
          <select
            value={form.subDepartmentId}
            onChange={set("subDepartmentId")}
            disabled={!form.departmentId}
          >
            <option value="">Select sub-department…</option>
            {subDepartments.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Cancel</button>
          <button className="btn-action primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Update Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Configuration Modal ───────────────────────────────────────────────

interface KpiConfigModalProps {
  mode: "add" | "edit";
  initialKpis: KpiItem[];
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function KpiConfigModal({ mode, initialKpis, onClose, onSaved, showToast }: KpiConfigModalProps) {
  const [draft, setDraft] = useState<{ name: string; weight: string }[]>(() =>
    mode === "add"
      ? [...initialKpis.map((kpi) => ({ name: kpi.name, weight: String(kpi.weight) })), { name: "", weight: "" }]
      : initialKpis.map((kpi) => ({ name: kpi.name, weight: String(kpi.weight) }))
  );
  const [saving, setSaving] = useState(false);

  const updateRow = (index: number, field: "name" | "weight", value: string) => {
    setDraft((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setDraft((prev) => [...prev, { name: "", weight: "" }]);
  };

  const handleSave = async () => {
    const trimmed = draft.map((row) => ({ name: row.name.trim(), weight: Number(row.weight) }));
    const invalidNames = trimmed.some((row) => !row.name);
    const invalidWeights = trimmed.some((row) => !Number.isFinite(row.weight) || row.weight <= 0);
    const total = trimmed.reduce((sum, row) => sum + (Number.isFinite(row.weight) ? row.weight : 0), 0);

    if (invalidNames || invalidWeights) {
      showToast("Each KPI needs a non-empty name and a positive weight.", "error");
      return;
    }

    if (Math.abs(total - 100) > 0.001) {
      showToast("KPI weights must add up to 100%.", "error");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/performance/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpis: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save KPI configuration");
      showToast(mode === "add" ? "KPI added successfully." : "KPIs updated successfully.", "success");
      onSaved();
      onClose();
    } catch (error: unknown) {
      showToast((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{mode === "add" ? "Add KPI" : "Edit KPI Weights"}</div>
        <p style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 16 }}>
          Update each KPI name and weight. The total must remain 100% before saving.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {draft.map((row, index) => (
            <div key={`${row.name}-${index}`} className="form-row" style={{ marginBottom: 0 }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>KPI Name</label>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(index, "name", e.target.value)}
                  placeholder={index === draft.length - 1 && mode === "add" ? "New KPI name" : "KPI name"}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Weight (%)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.weight}
                  onChange={(e) => updateRow(index, "weight", e.target.value)}
                  placeholder="%"
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button className="btn-action secondary" onClick={addRow}>+ Add Another KPI</button>
          <div className="modal-actions" style={{ marginTop: 0 }}>
            <button className="btn-action secondary" onClick={onClose}>Cancel</button>
            <button className="btn-action primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save KPIs"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Department Modal ──────────────────────────────────────────────────────

interface DepartmentModalProps {
  mode: "add" | "edit";
  department?: DepartmentItem;
  members: { _id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function DepartmentModal({ mode, department, members, onClose, onSaved, showToast }: DepartmentModalProps) {
  const [form, setForm] = useState({
    name: department?.name ?? "",
    officeType: department?.officeType ?? "Front Office",
    description: department?.description ?? "",
    memberCapacity: department?.memberCapacity != null ? String(department.memberCapacity) : "",
    deptLeaderId: department?.deptLeader?._id ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Department name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        officeType: form.officeType,
        description: form.description.trim(),
        memberCapacity: form.memberCapacity === "" ? null : Number(form.memberCapacity),
        deptLeader: form.deptLeaderId || null,
      };
      const res = await fetch(
        mode === "add" ? "/api/admin/departments" : `/api/admin/departments/${department?._id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save department");
      showToast(mode === "add" ? "Department created." : "Department updated.", "success");
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{mode === "add" ? "Add Department" : "Edit Department"}</div>
        <div className="form-field">
          <label>Name</label>
          <input value={form.name} onChange={set("name")} placeholder="e.g. Talent Management" />
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Office Type</label>
            <select value={form.officeType} onChange={set("officeType")}>
              <option value="Front Office">Front Office</option>
              <option value="Back Office">Back Office</option>
            </select>
          </div>
          <div className="form-field">
            <label>Member Capacity</label>
            <input type="number" min="0" value={form.memberCapacity} onChange={set("memberCapacity")} placeholder="Optional" />
          </div>
        </div>
        <div className="form-field">
          <label>Department Leader</label>
          <select value={form.deptLeaderId} onChange={set("deptLeaderId")}>
            <option value="">None</option>
            {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="What this department is responsible for…"
            style={{ padding: "9px 12px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 70 }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Cancel</button>
          <button className="btn-action primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Add Department" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Department Modal ──────────────────────────────────────────────────

interface SubDepartmentModalProps {
  mode: "add" | "edit";
  subDepartment?: SubDepartmentItem;
  departments: DepartmentItem[];
  members: { _id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

function SubDepartmentModal({ mode, subDepartment, departments, members, onClose, onSaved, showToast }: SubDepartmentModalProps) {
  const [form, setForm] = useState({
    name: subDepartment?.name ?? "",
    departmentId: subDepartment?.department?._id ?? "",
    description: subDepartment?.description ?? "",
    memberCapacity: subDepartment?.memberCapacity != null ? String(subDepartment.memberCapacity) : "",
    subDeptLeaderId: subDepartment?.subDeptLeader?._id ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Sub-department name is required.", "error");
      return;
    }
    if (mode === "add" && !form.departmentId) {
      showToast("Select a parent department.", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        memberCapacity: form.memberCapacity === "" ? null : Number(form.memberCapacity),
        subDeptLeader: form.subDeptLeaderId || null,
      };
      if (mode === "add") body.department = form.departmentId;

      const res = await fetch(
        mode === "add" ? "/api/admin/sub-departments" : `/api/admin/sub-departments/${subDepartment?._id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save sub-department");
      showToast(mode === "add" ? "Sub-department created." : "Sub-department updated.", "success");
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{mode === "add" ? "Add Sub-Department" : "Edit Sub-Department"}</div>
        <div className="form-field">
          <label>Name</label>
          <input value={form.name} onChange={set("name")} placeholder="e.g. Incoming Global Volunteer" />
        </div>
        <div className="form-field">
          <label>Parent Department</label>
          <select value={form.departmentId} onChange={set("departmentId")} disabled={mode === "edit"}>
            <option value="">Select department…</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label>Member Capacity</label>
            <input type="number" min="0" value={form.memberCapacity} onChange={set("memberCapacity")} placeholder="Optional" />
          </div>
          <div className="form-field">
            <label>Sub-Department Leader</label>
            <select value={form.subDeptLeaderId} onChange={set("subDeptLeaderId")}>
              <option value="">None</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.firstName} {m.lastName}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={set("description")}
            placeholder="What this sub-department is responsible for…"
            style={{ padding: "9px 12px", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 70 }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Cancel</button>
          <button className="btn-action primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Add Sub-Department" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AnnouncementModal ────────────────────────────────────────────────────────

interface AnnouncementModalProps {
  mode: "add" | "edit";
  announcement?: AnnouncementItem;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: "success" | "error") => void;
}

/** Convert an ISO date to the value format datetime-local inputs expect. */
const toLocalInputValue = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function AnnouncementModal({ mode, announcement, onClose, onSaved, showToast }: AnnouncementModalProps) {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [expiresAt, setExpiresAt] = useState(toLocalInputValue(announcement?.expiresAt));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return showToast("Title is required.", "error");
    if (!content.trim()) return showToast("Message content is required.", "error");

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const res = await fetch(
        mode === "add" ? "/api/announcements" : `/api/announcements/${announcement!._id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save announcement");
      showToast(mode === "add" ? "Announcement published!" : "Announcement updated.", "success");
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          {mode === "add" ? "Create Announcement" : "Edit Announcement"}
        </div>
        <div className="form-field">
          <label>Title</label>
          <input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. July submission deadline extended"
          />
        </div>
        <div className="form-field">
          <label>Message Content</label>
          <textarea
            value={content}
            maxLength={5000}
            rows={5}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the reminder, update, or organizational notice all users should see…"
          />
        </div>
        <div className="form-field">
          <label>Valid Until (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <span style={{ fontSize: 11, color: "var(--text-sub)" }}>
            Leave blank to keep the announcement visible until it is deleted.
            After this date it automatically disappears for users.
          </span>
        </div>
        <div className="modal-actions">
          <button className="btn-action secondary" onClick={onClose}>Cancel</button>
          <button className="btn-action primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : mode === "add" ? "Publish Announcement" : "Save Changes"}
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

  const [members, setMembers]               = useState<PopulatedMember[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [currentCycle, setCurrentCycle]     = useState<Cycle | null>(null);
  const [performanceMap, setPerformanceMap] = useState<Record<string, PerfSummary>>({});
  const [breakdownMember, setBreakdownMember] = useState<{ id: string; name: string } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingStats, setLoadingStats]     = useState(true);
  const [removingId, setRemovingId]         = useState<string | null>(null);
  const [search, setSearch]                 = useState("");
  const [showModal, setShowModal]           = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingMember, setEditingMember]   = useState<PopulatedMember | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [broadcastMsg, setBroadcastMsg]     = useState("");
  const [activeTab, setActiveTab]           = useState<"dashboard" | "members" | "kpi" | "departments" | "announcements">("dashboard");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [annLogs, setAnnLogs] = useState<AnnouncementLogItem[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annModalMode, setAnnModalMode] = useState<"add" | "edit">("add");
  const [editingAnn, setEditingAnn] = useState<AnnouncementItem | null>(null);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [kpiModalMode, setKpiModalMode] = useState<"add" | "edit">("add");
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingSubDepartments, setLoadingSubDepartments] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<"add" | "edit">("add");
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [showSubDeptModal, setShowSubDeptModal] = useState(false);
  const [subDeptModalMode, setSubDeptModalMode] = useState<"add" | "edit">("add");
  const [editingSubDept, setEditingSubDept] = useState<SubDepartmentItem | null>(null);

  const isAdmin = (session?.user as any)?.roleLevel >= 3;

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const { filteredSubmissions, summaryCounts } = useMemo(() => {
    let filtered = submissions;

    if (filterDept !== "All") {
      filtered = filtered.filter((sub) => sub.member.department?.name === filterDept);
    }

    if (filterStatus !== "All") {
      filtered = filtered.filter((sub) => sub.status === filterStatus);
    }

    const baseForSummary = filterDept === "All"
      ? submissions
      : submissions.filter((sub) => sub.member.department?.name === filterDept);

    const counts = {
      submitted: baseForSummary.filter((s) => s.status === "Submitted").length,
      flagged: baseForSummary.filter((s) => s.status === "Submitted with flags").length,
      missing: baseForSummary.filter((s) => s.status === "Not submitted").length,
    };

    return { filteredSubmissions: filtered, summaryCounts: counts };
  }, [submissions, filterDept, filterStatus]);

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

  const fetchCycleAndPerf = useCallback(async () => {
    try {
      const [cycleRes, perfRes] = await Promise.all([
        fetch("/api/cycles/current"),
        fetch("/api/admin/performance"),
      ]);
      if (cycleRes.ok) {
        const c = await cycleRes.json();
        if (!c.error) setCurrentCycle(c);
      }
      if (perfRes.ok) {
        const p = await perfRes.json();
        setPerformanceMap(p);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/admin/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions ?? data ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  const fetchKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const res = await fetch("/api/performance/kpis");
      const data = await res.json();
      if (res.ok) {
        setKpis(data.kpis ?? []);
      } else {
        setKpis([]);
      }
    } catch {
      setKpis([]);
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setLoadingDepartments(true);
    try {
      const res = await fetch("/api/admin/departments");
      const data = await res.json();
      if (res.ok) setDepartments(data.departments ?? []);
    } catch {
      showToast("Failed to load departments", "error");
    } finally {
      setLoadingDepartments(false);
    }
  }, [showToast]);

  const fetchSubDepartments = useCallback(async () => {
    setLoadingSubDepartments(true);
    try {
      const res = await fetch("/api/admin/sub-departments");
      const data = await res.json();
      if (res.ok) setSubDepartments(data.subDepartments ?? []);
    } catch {
      showToast("Failed to load sub-departments", "error");
    } finally {
      setLoadingSubDepartments(false);
    }
  }, [showToast]);

  const fetchAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const res = await fetch("/api/announcements/history");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements ?? []);
        setAnnLogs(data.logs ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    if (!window.confirm(`Delete the announcement "${title}"? Users will no longer see it, but it stays in the history log.`)) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      showToast("Announcement deleted.", "success");
      fetchAnnouncements();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchMembers();
      fetchStats();
      fetchCycleAndPerf();
      fetchSubmissions();
      fetchKpis();
      fetchDepartments();
      fetchSubDepartments();
      fetchAnnouncements();
    }
  }, [status, router, fetchMembers, fetchStats, fetchCycleAndPerf, fetchSubmissions, fetchKpis, fetchDepartments, fetchSubDepartments, fetchAnnouncements]);

  // Lightweight polling while the Department Management tab is open so
  // changes made from another device/session show up without a manual refresh.
  useEffect(() => {
    if (activeTab !== "departments") return;
    const interval = setInterval(() => {
      fetchDepartments();
      fetchSubDepartments();
    }, 12000);
    return () => clearInterval(interval);
  }, [activeTab, fetchDepartments, fetchSubDepartments]);

  const currentCycleLabel = currentCycle ? `${currentCycle.periodMonth} ${currentCycle.periodYear}` : "No active cycle";

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the LC portal? This cannot be undone.`)) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setMembers((prev) => prev.filter((m) => m._id !== id));
      showToast("Member removed.", "success");
      fetchStats();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Its sub-departments will be removed and any members will be marked Unassigned.`)) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      showToast(
        `Department removed. ${data.membersReassigned} member(s) and ${data.subDepartmentsRemoved} sub-department(s) affected.`,
        "success"
      );
      fetchDepartments();
      fetchSubDepartments();
      fetchMembers();
      fetchStats();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    }
  };

  const handleDeleteSubDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Any members will be marked Unassigned.`)) return;
    try {
      const res = await fetch(`/api/admin/sub-departments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      showToast(`Sub-department removed. ${data.membersReassigned} member(s) reassigned.`, "success");
      fetchSubDepartments();
      fetchDepartments();
      fetchMembers();
      fetchStats();
    } catch (err: unknown) {
      showToast((err as Error).message, "error");
    }
  };

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

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  const formatDeadlineShort = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
      {showEditModal && editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => { setShowEditModal(false); setEditingMember(null); }}
          onUpdated={() => { fetchMembers(); fetchStats(); }}
          showToast={showToast}
        />
      )}
      {showKpiModal && (
        <KpiConfigModal
          mode={kpiModalMode}
          initialKpis={kpis}
          onClose={() => setShowKpiModal(false)}
          onSaved={() => fetchKpis()}
          showToast={showToast}
        />
      )}
      {breakdownMember && performanceMap[breakdownMember.id] && (
        <KpiBreakdownModal
          memberName={breakdownMember.name}
          perf={performanceMap[breakdownMember.id]}
          onClose={() => setBreakdownMember(null)}
        />
      )}
      {showDeptModal && (
        <DepartmentModal
          mode={deptModalMode}
          department={deptModalMode === "edit" ? editingDept ?? undefined : undefined}
          members={members}
          onClose={() => { setShowDeptModal(false); setEditingDept(null); }}
          onSaved={() => fetchDepartments()}
          showToast={showToast}
        />
      )}
      {showSubDeptModal && (
        <SubDepartmentModal
          mode={subDeptModalMode}
          subDepartment={subDeptModalMode === "edit" ? editingSubDept ?? undefined : undefined}
          departments={departments}
          members={members}
          onClose={() => { setShowSubDeptModal(false); setEditingSubDept(null); }}
          onSaved={() => { fetchSubDepartments(); fetchDepartments(); }}
          showToast={showToast}
        />
      )}
      {showAnnModal && (
        <AnnouncementModal
          mode={annModalMode}
          announcement={annModalMode === "edit" ? editingAnn ?? undefined : undefined}
          onClose={() => { setShowAnnModal(false); setEditingAnn(null); }}
          onSaved={() => fetchAnnouncements()}
          showToast={showToast}
        />
      )}

      {/* Login-first system announcements (shown to leaders landing on /admin) */}
      <AnnouncementsModal />

      <div className="admin-app">
        {/* ── Sidebar ── */}
        <nav className="admin-sidebar">
          <div>
            <div className="sidebar-logo">
              AIESEC <span style={{ fontWeight: 400, fontSize: 14, color: "#666" }}>PM Admin</span>
            </div>
            <ul className="sidebar-menu">
              <li
                className={`menu-item${activeTab === "dashboard" ? " active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                LC Dashboard
              </li>
              <li
                className={`menu-item${activeTab === "members" ? " active" : ""}`}
                onClick={() => setActiveTab("members")}
              >
                Member Management
              </li>
              <li
                className={`menu-item${activeTab === "kpi" ? " active" : ""}`}
                onClick={() => setActiveTab("kpi")}
              >
                KPI Configuration
              </li>
              <li
                className={`menu-item${activeTab === "departments" ? " active" : ""}`}
                onClick={() => setActiveTab("departments")}
              >
                Department Management
              </li>
              <li
                className={`menu-item${activeTab === "announcements" ? " active" : ""}`}
                onClick={() => setActiveTab("announcements")}
              >
                Announcements
              </li>
              <li
                className="menu-item"
                onClick={() => router.push("/admin/deadline")}
              >
                Deadline Management
              </li>
              <li
                className="menu-item"
                onClick={() => router.push("/team")}
              >
                Team Records
              </li>
            </ul>
          </div>
          <div>
            <div
              className="menu-item"
              onClick={() => voluntaryLogout("/")}
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
                  {(session?.user as any)?.department ?? "Performance Management"}
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
                <h1 className="body-greeting">
                  {activeTab === "dashboard"
                    ? "LC Dashboard."
                    : activeTab === "members"
                      ? "LC Member Management."
                      : activeTab === "kpi"
                        ? "KPI Configuration."
                        : activeTab === "departments"
                          ? "Department Management."
                          : "System Announcements."}
                </h1>
              </div>
              <div className="intro-actions">
                {activeTab === "members" && (
                  <>
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
                  </>
                )}
                {activeTab === "dashboard" && (
                  <>
                    <button
                      className="btn-action primary"
                      onClick={() => router.push("/admin/deadline")}
                    >
                      Manage Deadlines
                    </button>
                    <button
                      className={`btn-action primary${!isAdmin ? " restricted" : ""}`}
                      onClick={() => { setAnnModalMode("add"); setEditingAnn(null); setShowAnnModal(true); }}
                    >
                      + Create Announcement
                    </button>
                  </>
                )}
                {activeTab === "announcements" && (
                  <button
                    className={`btn-action primary${!isAdmin ? " restricted" : ""}`}
                    onClick={() => { setAnnModalMode("add"); setEditingAnn(null); setShowAnnModal(true); }}
                  >
                    + Create Announcement
                  </button>
                )}
                {activeTab === "kpi" && (
                  <>
                    <button
                      className="btn-action secondary"
                      onClick={() => {
                        setKpiModalMode("edit");
                        setShowKpiModal(true);
                      }}
                    >
                      Edit KPIs
                    </button>
                    <button
                      className="btn-action primary"
                      onClick={() => {
                        setKpiModalMode("add");
                        setShowKpiModal(true);
                      }}
                    >
                      + Add KPI
                    </button>
                  </>
                )}
                {activeTab === "departments" && (
                  <>
                    <button
                      className={`btn-action secondary${!isAdmin ? " restricted" : ""}`}
                      onClick={() => { setSubDeptModalMode("add"); setEditingSubDept(null); setShowSubDeptModal(true); }}
                    >
                      + Add Sub-Department
                    </button>
                    <button
                      className={`btn-action primary${!isAdmin ? " restricted" : ""}`}
                      onClick={() => { setDeptModalMode("add"); setEditingDept(null); setShowDeptModal(true); }}
                    >
                      + Add Department
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="body-metrics">
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats
                    ? <div className="loading-shimmer" style={{ width: 60 }} />
                    : (stats?.totalMembers ?? "—")}
                </div>
                <div className="metric-label">Total Active Members</div>
              </div>
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats
                    ? <div className="loading-shimmer" style={{ width: 60 }} />
                    : stats?.avgKpiAchievement != null ? `${stats.avgKpiAchievement}%` : "N/A"}
                </div>
                <div className="metric-label">
                  Avg KPI Achievement{stats?.currentPeriod ? ` (${stats.currentPeriod})` : ""}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-data">
                  {loadingStats
                    ? <div className="loading-shimmer" style={{ width: 60 }} />
                    : (stats?.pendingSubmissions ?? "—")}
                </div>
                <div className="metric-label">Pending Submissions This Period</div>
              </div>
            </div>

            {/* ── LC Dashboard tab ── */}
            {activeTab === "dashboard" && (
              <div className="content-table">
                <div className="table-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 15 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <h2 className="table-title">MTT Monitoring Dashboard</h2>
                      <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4 }}>
                        Current Cycle: <strong>{currentCycleLabel}</strong>
                        {currentCycle && (
                          <>
                            {" · "}Deadline:{" "}
                            <strong>{formatDeadlineShort(currentCycle.submissionDeadline)}</strong>
                            {" "}
                            <span
                              style={{
                                fontWeight: 600,
                                color: currentCycle.isOpen ? "var(--success-green)" : "var(--warning-yellow)",
                              }}
                            >
                              {currentCycle.isOpen ? "• Open for submissions" : "• Finalized — entries locked"}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

                  <div style={{ display: "flex", gap: 15, width: "100%", padding: 15, background: "var(--secondary-bg)", borderRadius: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success-green)" }}>{summaryCounts.submitted}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Submitted</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, textAlign: "center", borderLeft: "1px solid #ddd", borderRight: "1px solid #ddd" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--warning-yellow)" }}>{summaryCounts.flagged}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Flagged</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger-red)" }}>{summaryCounts.missing}</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)" }}>Not Submitted</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 15, paddingBottom: 12, borderBottom: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  <div>Member</div>
                  <div>Portfolio</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>

                <div className="table-body">
                  {loadingSubmissions ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 15, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--secondary-bg)" }}>
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
                      const pillClass = sub.status === "Submitted"
                        ? "success"
                        : sub.status === "Submitted with flags"
                          ? "warning"
                          : "danger";

                      return (
                        <div key={sub._id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 15, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--secondary-bg)" }}>
                          <div className="table-cell member">
                            <div className={`member-avatar ${avatarClass(sub.member._id)}`} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {sub.member.firstName} {sub.member.lastName}
                              </div>
                              <div className="member-subtext" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {sub.member.email}
                              </div>
                            </div>
                          </div>

                          <div className="table-cell">
                            <div>{sub.member.department?.name ?? "—"}</div>
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
                              View Entry
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Member Management tab ── */}
            {activeTab === "members" && (
              <>
                <div className="content-table">
                  <div className="table-header">
                    <h2 className="table-title">
                      All Members{" "}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>
                        ({filtered.length})
                      </span>
                    </h2>
                    <div>
                      <span className="filter-dropdown">All Departments ▾</span>
                      <span className="filter-dropdown">All Roles ▾</span>
                    </div>
                  </div>

                  <div className="table-grid-header">
                    <div>Member</div>
                    <div>Department</div>
                    <div>Role</div>
                    <div>Performance</div>
                    <div>Next Deadline (MTT)</div>
                    <div>Actions</div>
                  </div>

                  <div className="table-body">
                    {loadingMembers ? (
                      [1, 2, 3].map((i) => (
                        <div className="table-row-6" key={i}>
                          <div className="loading-shimmer" style={{ width: "80%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "50%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "50%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                        </div>
                      ))
                    ) : filtered.length === 0 ? (
                      <div style={{ padding: "24px 0", color: "#999", fontSize: 14 }}>
                        {search ? "No members match your search." : "No members found."}
                      </div>
                    ) : (
                      filtered.map((m) => (
                        <div
                          className="table-row-6"
                          key={m._id}
                          style={{ opacity: removingId === m._id ? 0.4 : 1 }}
                        >
                          <div className="table-cell member">
                            <div className={`member-avatar ${avatarClass(m._id)}`} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {m.firstName} {m.lastName}
                              </div>
                              <div className="member-subtext" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {m.email}
                              </div>
                            </div>
                          </div>

                          <div className="table-cell">
                            <div>{m.department?.name ?? "Unassigned"}</div>
                            <div className="member-subtext">{m.department?.officeType ?? ""}</div>
                          </div>

                          <div
                            className="table-cell"
                            style={{
                              fontWeight: m.role?.level === 3 ? 600 : 500,
                              color: m.role?.level === 3 ? "#037ef3" : m.role?.level === 1 ? "#666" : undefined,
                              fontSize: 13,
                            }}
                          >
                            {m.role?.title ?? "—"}
                          </div>

                          <div className="table-cell">
                            <PerfBar
                              perf={performanceMap[m._id]}
                              onShowBreakdown={
                                performanceMap[m._id]
                                  ? () => setBreakdownMember({ id: m._id, name: `${m.firstName} ${m.lastName}` })
                                  : undefined
                              }
                            />
                          </div>

                          <div className="table-cell">
                            {currentCycle ? (
                              <>
                                <div style={{ fontSize: 13 }}>Monthly Team Tool</div>
                                <div className="member-subtext">
                                  {formatDeadlineShort(currentCycle.submissionDeadline)}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "#ccc", fontSize: 13 }}>No active cycle</span>
                            )}
                          </div>

                          <div className="table-cell row-actions">
                            <button
                              className="btn-icon"
                              onClick={() => router.push(`/profile/${m._id}`)}
                            >
                              View
                            </button>
                            <button
                              className={`btn-icon${!isAdmin ? " disabled-btn" : ""}`}
                              style={{ color: isAdmin ? "#037ef3" : undefined, borderColor: isAdmin ? "#c4deff" : undefined }}
                              onClick={() => { setEditingMember(m); setShowEditModal(true); }}
                            >
                              Edit
                            </button>
                            <button
                              className={`btn-icon delete-btn${!isAdmin ? " disabled-btn" : ""}`}
                              onClick={() => handleDelete(m._id, `${m.firstName} ${m.lastName}`)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="content-lower">
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
                              <span style={{
                                fontSize: 12,
                                color: dept.pill === "warning" ? "#ef4444" : "#666",
                                fontWeight: dept.pill === "warning" ? 600 : 400,
                              }}>
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
              </>
            )}

            {activeTab === "kpi" && (
              <div className="content-table">
                <div className="table-header">
                  <div>
                    <h2 className="table-title">KPI Configuration</h2>
                    <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4 }}>
                      Each KPI is stored on the current user&apos;s performance record and weights must total 100%.
                    </p>
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn-action secondary"
                      onClick={() => {
                        setKpiModalMode("edit");
                        setShowKpiModal(true);
                      }}
                    >
                      Edit KPIs
                    </button>
                    <button
                      className="btn-action primary"
                      onClick={() => {
                        setKpiModalMode("add");
                        setShowKpiModal(true);
                      }}
                    >
                      + Add KPI
                    </button>
                  </div>
                </div>

                {loadingKpis ? (
                  <div className="loading-shimmer" style={{ width: "100%", height: 120 }} />
                ) : kpis.length === 0 ? (
                  <div style={{ padding: "24px 0", color: "#999", fontSize: 14 }}>
                    No KPI configuration exists yet. Add the default set to begin.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {kpis.map((kpi, index) => (
                      <div
                        key={`${kpi.name}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 16px",
                          border: "1px solid var(--border-color)",
                          borderRadius: 10,
                          background: "var(--bg-main)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{kpi.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-sub)" }}>Weighted KPI</div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{kpi.weight}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "departments" && (
              <>
                <div className="content-table">
                  <div className="table-header">
                    <h2 className="table-title">
                      Departments{" "}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>
                        ({departments.length})
                      </span>
                    </h2>
                  </div>
                  <div className="table-grid-header">
                    <div>Name</div>
                    <div>Office Type</div>
                    <div>Leader</div>
                    <div>Description</div>
                    <div>Members</div>
                    <div>Actions</div>
                  </div>
                  <div className="table-body">
                    {loadingDepartments ? (
                      [1, 2].map((i) => (
                        <div className="table-row-6" key={i}>
                          <div className="loading-shimmer" style={{ width: "80%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "50%" }} />
                          <div className="loading-shimmer" style={{ width: "70%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                        </div>
                      ))
                    ) : departments.length === 0 ? (
                      <div style={{ padding: "24px 0", color: "#999", fontSize: 14 }}>
                        No departments yet. Add one to get started.
                      </div>
                    ) : (
                      departments.map((d) => (
                        <div className="table-row-6" key={d._id}>
                          <div className="table-cell">{d.name}</div>
                          <div className="table-cell">{d.officeType}</div>
                          <div className="table-cell">
                            {d.deptLeader ? `${d.deptLeader.firstName} ${d.deptLeader.lastName}` : "—"}
                          </div>
                          <div
                            className="table-cell member-subtext"
                            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            title={d.description}
                          >
                            {d.description || "—"}
                          </div>
                          <div className="table-cell">
                            {d.memberCount}{d.memberCapacity != null ? ` / ${d.memberCapacity}` : ""}
                            <div className="member-subtext">{d.subDepartmentCount} sub-department(s)</div>
                          </div>
                          <div className="table-cell row-actions">
                            <button
                              className={`btn-icon${!isAdmin ? " disabled-btn" : ""}`}
                              onClick={() => { setEditingDept(d); setDeptModalMode("edit"); setShowDeptModal(true); }}
                            >
                              Edit
                            </button>
                            <button
                              className={`btn-icon delete-btn${!isAdmin ? " disabled-btn" : ""}`}
                              onClick={() => handleDeleteDepartment(d._id, d.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="content-table">
                  <div className="table-header">
                    <h2 className="table-title">
                      Sub-Departments{" "}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>
                        ({subDepartments.length})
                      </span>
                    </h2>
                  </div>
                  <div className="table-grid-header">
                    <div>Name</div>
                    <div>Parent Department</div>
                    <div>Leader</div>
                    <div>Description</div>
                    <div>Members</div>
                    <div>Actions</div>
                  </div>
                  <div className="table-body">
                    {loadingSubDepartments ? (
                      [1, 2].map((i) => (
                        <div className="table-row-6" key={i}>
                          <div className="loading-shimmer" style={{ width: "80%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "50%" }} />
                          <div className="loading-shimmer" style={{ width: "70%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                        </div>
                      ))
                    ) : subDepartments.length === 0 ? (
                      <div style={{ padding: "24px 0", color: "#999", fontSize: 14 }}>
                        No sub-departments yet. Add one to get started.
                      </div>
                    ) : (
                      subDepartments.map((s) => (
                        <div className="table-row-6" key={s._id}>
                          <div className="table-cell">{s.name}</div>
                          <div className="table-cell">{s.department?.name ?? "—"}</div>
                          <div className="table-cell">
                            {s.subDeptLeader ? `${s.subDeptLeader.firstName} ${s.subDeptLeader.lastName}` : "—"}
                          </div>
                          <div
                            className="table-cell member-subtext"
                            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                            title={s.description}
                          >
                            {s.description || "—"}
                          </div>
                          <div className="table-cell">
                            {s.memberCount}{s.memberCapacity != null ? ` / ${s.memberCapacity}` : ""}
                          </div>
                          <div className="table-cell row-actions">
                            <button
                              className={`btn-icon${!isAdmin ? " disabled-btn" : ""}`}
                              onClick={() => { setEditingSubDept(s); setSubDeptModalMode("edit"); setShowSubDeptModal(true); }}
                            >
                              Edit
                            </button>
                            <button
                              className={`btn-icon delete-btn${!isAdmin ? " disabled-btn" : ""}`}
                              onClick={() => handleDeleteSubDepartment(s._id, s.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Announcements tab ── */}
            {activeTab === "announcements" && (
              <>
                {/* All announcements (incl. expired + deleted) */}
                <div className="content-table">
                  <div className="table-header">
                    <h2 className="table-title">
                      All Announcements{" "}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>
                        ({announcements.length})
                      </span>
                    </h2>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 0.8fr 1fr", gap: 15, paddingBottom: 12, borderBottom: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <div>Announcement</div>
                    <div>Posted</div>
                    <div>Valid Until</div>
                    <div>Status</div>
                    <div>Actions</div>
                  </div>

                  <div className="table-body">
                    {loadingAnnouncements ? (
                      [1, 2].map((i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 0.8fr 1fr", gap: 15, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--secondary-bg)" }}>
                          <div className="loading-shimmer" style={{ width: "80%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "60%" }} />
                          <div className="loading-shimmer" style={{ width: "50%" }} />
                          <div className="loading-shimmer" style={{ width: "40%" }} />
                        </div>
                      ))
                    ) : announcements.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-sub)" }}>
                        <h3>No announcements have been posted yet.</h3>
                        <p style={{ fontSize: 13, marginTop: 6 }}>
                          Use “+ Create Announcement” to publish the first system-wide notice.
                        </p>
                      </div>
                    ) : (
                      announcements.map((a) => {
                        const pill = a.status === "Active" ? "success" : a.status === "Expired" ? "warning" : "danger";
                        return (
                          <div key={a._id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 0.8fr 1fr", gap: 15, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--secondary-bg)", opacity: a.status === "Deleted" ? 0.6 : 1 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.title}
                              </div>
                              <div className="member-subtext" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a.content}>
                                {a.content}
                              </div>
                            </div>
                            <div className="table-cell" style={{ fontSize: 13 }}>
                              {formatDeadlineShort(a.postedAt)}
                              <div className="member-subtext">{a.createdByName}</div>
                            </div>
                            <div className="table-cell" style={{ fontSize: 13 }}>
                              {a.expiresAt ? formatDeadlineShort(a.expiresAt) : "No expiry"}
                            </div>
                            <div className="table-cell">
                              <span className={`status-pill ${pill}`}>{a.status}</span>
                            </div>
                            <div className="table-cell row-actions">
                              {a.status !== "Deleted" && (
                                <>
                                  <button
                                    className={`btn-icon${!isAdmin ? " disabled-btn" : ""}`}
                                    onClick={() => { setEditingAnn(a); setAnnModalMode("edit"); setShowAnnModal(true); }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className={`btn-icon delete-btn${!isAdmin ? " disabled-btn" : ""}`}
                                    onClick={() => handleDeleteAnnouncement(a._id, a.title)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Announcement history / logs */}
                <div className="content-table">
                  <div className="table-header">
                    <h2 className="table-title">Announcement History / Logs</h2>
                  </div>
                  {annLogs.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-sub)", fontSize: 14 }}>
                      No announcement activity yet.
                    </div>
                  ) : (
                    <div className="table-body">
                      {annLogs.map((log) => {
                        const pill = log.action === "create" ? "success" : log.action === "edit" ? "info" : "danger";
                        return (
                          <div key={log._id} style={{ padding: "14px 0", borderBottom: "1px solid var(--secondary-bg)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span className={`status-pill ${pill}`} style={{ textTransform: "capitalize" }}>
                                {log.action === "create" ? "Created" : log.action === "edit" ? "Edited" : "Deleted"}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{log.titleSnapshot}</span>
                              <span style={{ fontSize: 12, color: "var(--text-sub)", marginLeft: "auto" }}>
                                {new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>
                            {log.changes.length > 0 && (
                              <ul style={{ listStyle: "none", margin: "8px 0 0", fontSize: 13, color: "var(--text-sub)" }}>
                                {log.changes.map((c, i) => (
                                  <li key={i} style={{ marginBottom: 2 }}>
                                    <strong style={{ color: "var(--text-color)" }}>{c.field}</strong>:{" "}
                                    <span style={{ textDecoration: "line-through" }}>{String(c.from ?? "—").slice(0, 60)}</span>
                                    {" → "}
                                    <span style={{ color: "var(--text-color)" }}>{String(c.to ?? "—").slice(0, 60)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 6 }}>
                              By <strong>{log.actorName}</strong>{log.actorRole ? ` (${log.actorRole})` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
