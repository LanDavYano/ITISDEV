import React, { useMemo, useState } from "react";

/**
 * AIESEC PM Portal — Member Management
 *
 * Faithful TSX port of adminpage.html / adminpage.css / adminpage.js.
 * All markup, classes, and visual rules are preserved 1:1; the imperative
 * DOM logic (role simulator, delete confirmation, logout, dynamic dates)
 * has been re-implemented with React state and event handlers.
 */

type Role = "Admin" | "Member";

interface Member {
  id: string;
  name: string;
  email: string;
  avatarClass: "avatar-1" | "avatar-2" | "avatar-3";
  deptMain: string;
  deptSub: string;
  role: string;
  roleStyle: React.CSSProperties;
  perfPercent: number;
  perfTier: "excellent" | "warning";
  deadlineTask: string;
  deadlineType: "start" | "end";
}

const INITIAL_MEMBERS: Member[] = [
  {
    id: "raina-helaga",
    name: "Raina Helaga",
    email: "raina.helaga@aiesec.ph",
    avatarClass: "avatar-1",
    deptMain: "Front Office",
    deptSub: "Outgoing Exchange (oGX)",
    role: "LCVP",
    roleStyle: { fontWeight: 600, color: "#037ef3" },
    perfPercent: 98,
    perfTier: "excellent",
    deadlineTask: "Monthly Team Tool",
    deadlineType: "start",
  },
  {
    id: "andie-woo",
    name: "Andie Woo",
    email: "andie.woo@aiesec.ph",
    avatarClass: "avatar-2",
    deptMain: "Back Office",
    deptSub: "Talent Management (TM)",
    role: "Team Leader (TL)",
    roleStyle: { fontWeight: 500 },
    perfPercent: 96,
    perfTier: "excellent",
    deadlineTask: "Submit Team Tool",
    deadlineType: "end",
  },
  {
    id: "christine-cote",
    name: "Christine Cote",
    email: "christine.cote@aiesec.ph",
    avatarClass: "avatar-3",
    deptMain: "Back Office",
    deptSub: "Business Development (BD)",
    role: "Team Member (TM)",
    roleStyle: { color: "#666" },
    perfPercent: 92,
    perfTier: "excellent",
    deadlineTask: "Submit Team Tool",
    deadlineType: "end",
  },
];

interface DeptStatus {
  name: string;
  ratio: string;
  pill: "success" | "info" | "warning";
  pillLabel: string;
  ratioStyle: React.CSSProperties;
}

const DEPT_STATUS: DeptStatus[] = [
  { name: "Incoming Global Talent (iGT)", ratio: "8/8", pill: "success", pillLabel: "Complete", ratioStyle: { fontSize: 12, color: "#666", fontWeight: 400 } },
  { name: "Incoming Global Volunteer (iGV)", ratio: "10/12", pill: "info", pillLabel: "On Track", ratioStyle: { fontSize: 12, color: "#666", fontWeight: 400 } },
  { name: "Outgoing Exchange (oGX)", ratio: "9/15", pill: "warning", pillLabel: "Needs Action", ratioStyle: { fontSize: 12, color: "#ef4444", fontWeight: 600 } },
  { name: "Marketing (MKT)", ratio: "5/5", pill: "success", pillLabel: "Complete", ratioStyle: { fontSize: 12, color: "#666", fontWeight: 400 } },
  { name: "Business Development (BD)", ratio: "4/6", pill: "info", pillLabel: "On Track", ratioStyle: { fontSize: 12, color: "#666", fontWeight: 400 } },
  { name: "Finance & Legal Administration (FLA)", ratio: "3/3", pill: "success", pillLabel: "Complete", ratioStyle: { fontSize: 12, color: "#666", fontWeight: 400 } },
  { name: "Talent Management (TM)", ratio: "12/20", pill: "warning", pillLabel: "Needs Action", ratioStyle: { fontSize: 12, color: "#ef4444", fontWeight: 600 } },
];

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
    --shadow-main: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.aiesec-admin-root * { margin: 0; padding: 0; box-sizing: border-box; }

.aiesec-admin-root { font-family: 'Inter', sans-serif; color: var(--text-color); background-color: var(--bg-main); }

.admin-app { display: flex; height: 100vh; }

.admin-sidebar { width: 260px; background-color: var(--sidebar-bg); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; padding: 24px; }
.sidebar-logo { font-size: 22px; font-weight: 700; margin-bottom: 40px; color: var(--primary-blue); }
.sidebar-menu { list-style: none; }
.menu-item { display: flex; align-items: center; padding: 12px 16px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; color: var(--text-sub); font-weight: 500; font-size: 14px; }
.menu-item.active { background-color: var(--active-item-bg); color: var(--primary-blue); font-weight: 600; }
.sidebar-bottom .menu-item { margin-top: auto; }

.admin-main { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; }
.admin-header { height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; border-bottom: 1px solid var(--border-color); background: #fff; }
.header-search { position: relative; width: 350px; }
.header-search input { width: 100%; padding: 10px 35px 10px 15px; border-radius: 8px; border: 1px solid var(--border-color); background-color: var(--bg-main); font-size: 14px; outline: none; }
.search-kbd { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--text-sub); background-color: var(--secondary-bg); padding: 3px 6px; border-radius: 4px; }
.header-actions { display: flex; align-items: center; gap: 15px; }
.profile-avatar { width: 36px; height: 36px; border-radius: 50%; background-color: var(--primary-blue); }

.admin-body { padding: 40px 30px; flex-grow: 1; }
.body-intro { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
.body-date { font-size: 14px; color: var(--text-sub); margin-bottom: 5px; }
.body-greeting { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }

.intro-actions { display: flex; gap: 12px; }
.btn-action { padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; border: none; transition: 0.2s; }
.btn-action.primary { background-color: var(--primary-blue); color: white; }
.btn-action.primary:hover { background-color: var(--primary-hover); }
.btn-action.secondary { background-color: var(--secondary-bg); color: var(--text-color); border: 1px solid var(--border-color); }
.btn-action.secondary:hover { background-color: #e5e7eb; }
.full-width { width: 100%; margin-top: 15px; }

.body-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
.metric-card { background-color: white; padding: 24px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-main); }
.metric-data { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.metric-label { font-size: 13px; color: var(--text-sub); }

.content-table { background-color: white; padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-main); margin-bottom: 20px;}
.table-header { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: center; }
.table-title { font-size: 18px; font-weight: 600; }
.filter-dropdown { font-size: 13px; font-weight: 500; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-block; margin-left: 10px;}

.table-grid-header { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr; gap: 15px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px; }
.table-body { display: flex; flex-direction: column; }
.table-row { display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr; gap: 15px; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--secondary-bg); transition: opacity 0.3s; }
.table-row:last-child { border-bottom: none; padding-bottom: 0; }

.table-cell { font-size: 14px; font-weight: 500; }
.member-subtext { font-size: 12px; color: var(--text-sub); font-weight: 400; margin-top: 2px; }

.member { display: flex; align-items: center; gap: 12px; }
.member-avatar { width: 36px; height: 36px; border-radius: 50%; }
.avatar-1 { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
.avatar-2 { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); }
.avatar-3 { background: linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%); }

.perf { display: flex; align-items: center; gap: 10px; }
.perf-bar-bg { flex-grow: 1; height: 6px; background-color: var(--secondary-bg); border-radius: 4px; overflow: hidden; }
.perf-bar-fill { height: 100%; border-radius: 4px; }
.perf-bar-fill.excellent { background-color: var(--success-green); }
.perf-bar-fill.warning { background-color: var(--warning-yellow); }
.perf-score { font-size: 13px; font-weight: 600; width: 35px; }

.row-actions { display: flex; gap: 8px; }
.btn-icon { background: none; border: 1px solid var(--border-color); padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500; color: var(--text-color); transition: 0.2s; }
.btn-icon:hover { background-color: var(--secondary-bg); }
.delete-btn { color: var(--danger-red); border-color: #fca5a5; }
.delete-btn:hover { background-color: #fee2e2; border-color: var(--danger-red); }

.content-lower { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.widget-card { background-color: white; padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-main); }
.lower-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.widget-desc { font-size: 13px; color: var(--text-sub); margin-bottom: 15px; }
.broadcast-input { width: 100%; height: 100px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; resize: none; font-family: inherit; font-size: 14px; outline: none; }
.broadcast-input:focus { border-color: var(--primary-blue); }

.dept-list { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
.dept-list li { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 500; padding: 8px 0; border-bottom: 1px solid var(--secondary-bg); }
.dept-list li:last-child { border-bottom: none; }
.status-pill { font-size: 12px; padding: 4px 10px; border-radius: 12px; font-weight: 600; }
.status-pill.success { background-color: #d1fae5; color: #065f46; }
.status-pill.warning { background-color: #fef3c7; color: #92400e; }
.status-pill.info { background-color: #dbeafe; color: #1e40af; }

.restricted {
    display: none !important;
}

.disabled-btn {
    opacity: 0.4;
    cursor: not-allowed !important;
    pointer-events: none;
}
`;

export default function AdminPage(): React.ReactElement {
  const [role, setRole] = useState<Role>("Admin");
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  // Equivalent to setDynamicDeadlines(): computed once on mount, mirroring
  // the original's window.onload behavior.
  const { startOfNextMonth, endOfMonth } = useMemo(() => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    return {
      endOfMonth: end.toLocaleDateString("en-US", options),
      startOfNextMonth: start.toLocaleDateString("en-US", options),
    };
  }, []);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  }, []);

  const isAdmin = role === "Admin";

  const handleDelete = (memberId: string, memberName: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to remove this member from the LC portal? This action cannot be undone."
    );
    if (!isConfirmed) return;

    setRemovingId(memberId);
    setTimeout(() => {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setRemovingId(null);
      window.alert("Member successfully removed.");
    }, 300);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of the PM Portal?")) {
      window.alert("You have been successfully logged out.");
      setLoggedOut(true);
    }
  };

  const handleBroadcastSend = () => {
    window.alert("Message sent to all members successfully!");
  };

  if (loggedOut) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
        <h1>Logged Out</h1>
      </div>
    );
  }

  return (
    <div className="aiesec-admin-root">
      <style>{STYLES}</style>
      <div className="admin-app">
        <nav className="admin-sidebar">
          <div className="sidebar-top">
            <div className="sidebar-logo">
              AIESEC <span style={{ fontWeight: 400, fontSize: 14, color: "#666" }}>PM Admin</span>
            </div>
            <ul className="sidebar-menu">
              <li className="menu-item">
                <span className="menu-text">LC Dashboard</span>
              </li>
              <li className="menu-item active">
                <span className="menu-text">Member Management</span>
              </li>
            </ul>
          </div>
          <div className="sidebar-bottom">
            <div className="menu-item" onClick={handleLogout} style={{ cursor: "pointer" }}>
              <span className="menu-text" style={{ color: "var(--danger-red)", fontWeight: 600 }}>
                Log Out
              </span>
            </div>
          </div>
        </nav>

        <main className="admin-main">
          <header className="admin-header">
            <div className="header-left">
              <div className="header-search">
                <input type="text" placeholder="Search members, roles, or portfolios..." />
                <span className="search-kbd">⌘ F</span>
              </div>
            </div>
            <div className="header-right">
              <div className="header-actions">
                <div style={{ marginRight: 20, display: "flex", alignItems: "center", gap: 10 }}>
                  <label htmlFor="role-simulator" style={{ fontSize: 12, fontWeight: 600, color: "#666" }}>
                    VIEW AS:
                  </label>
                  <select
                    id="role-simulator"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    style={{ padding: 5, borderRadius: 4, border: "1px solid #ccc", fontSize: 13, background: "white", outline: "none" }}
                  >
                    <option value="Admin">Admin (PM)</option>
                    <option value="Member">Standard Member (TM/TL)</option>
                  </select>
                </div>

                <div style={{ fontSize: 13, fontWeight: 500, textAlign: "right", lineHeight: 1.2 }}>
                  <div id="current-user-name">{isAdmin ? "Admin User" : "Standard Member"}</div>
                  <div id="current-user-dept" style={{ color: "#777", fontSize: 11 }}>
                    {isAdmin ? "Performance Management" : "Local Committee"}
                  </div>
                </div>
                <div className="header-profile">
                  <div className="profile-avatar"></div>
                </div>
              </div>
            </div>
          </header>

          <div className="admin-body">
            <div className="body-intro">
              <div className="intro-left">
                <div className="body-date">{todayLabel}</div>
                <h1 className="body-greeting">LC Member Management.</h1>
              </div>
              <div className="intro-right">
                <div className="intro-actions">
                  <button
                    className={`btn-action secondary ${!isAdmin ? "restricted" : ""}`}
                    id="broadcast-btn"
                    onClick={() => window.alert("Opening Broadcast Modal...")}
                  >
                    Broadcast Reminder
                  </button>
                  <button
                    className={`btn-action primary ${!isAdmin ? "restricted" : ""}`}
                    id="add-member-btn"
                    onClick={() => window.alert("Opening Add Member Form...")}
                  >
                    + Add Member
                  </button>
                </div>
              </div>
            </div>

            <div className="body-metrics">
              <div className="metric-card">
                <div className="metric-data">84</div>
                <div className="metric-label">Total Active Members</div>
              </div>
              <div className="metric-card">
                <div className="metric-data">91%</div>
                <div className="metric-label">Average KPI Achievement</div>
              </div>
              <div className="metric-card">
                <div className="metric-data">32</div>
                <div className="metric-label">Pending Team Tools</div>
              </div>
            </div>

            <div className="body-content">
              <div className="content-table">
                <div className="table-header">
                  <h2 className="table-title">Top Performing Members</h2>
                  <div className="table-filters">
                    <div className="filter-dropdown">All Portfolios ▾</div>
                    <div className="filter-dropdown">All Roles ▾</div>
                  </div>
                </div>

                <div className="table-grid-header">
                  <div>Member</div>
                  <div>Portfolio</div>
                  <div>Role</div>
                  <div>Performance</div>
                  <div>Next Deadline (MTT)</div>
                  <div>Actions</div>
                </div>

                <div className="table-body">
                  {members.map((member) => (
                    <div
                      className="table-row"
                      key={member.id}
                      style={{ opacity: removingId === member.id ? 0.5 : 1 }}
                    >
                      <div className="table-cell member">
                        <div className={`member-avatar ${member.avatarClass}`}></div>
                        <div className="member-info">
                          <div className="member-name">{member.name}</div>
                          <div className="member-subtext">{member.email}</div>
                        </div>
                      </div>
                      <div className="table-cell dept">
                        <div className="dept-main">{member.deptMain}</div>
                        <div className="member-subtext">{member.deptSub}</div>
                      </div>
                      <div className="table-cell role" style={member.roleStyle}>
                        {member.role}
                      </div>
                      <div className="table-cell perf">
                        <div className="perf-bar-bg">
                          <div
                            className={`perf-bar-fill ${member.perfTier}`}
                            style={{ width: `${member.perfPercent}%` }}
                          ></div>
                        </div>
                        <span className="perf-score">{member.perfPercent}%</span>
                      </div>
                      <div className="table-cell deadline">
                        <div className="deadline-task">{member.deadlineTask}</div>
                        <div className="member-subtext">
                          {member.deadlineType === "start" ? startOfNextMonth : endOfMonth}
                        </div>
                      </div>
                      <div className="table-cell row-actions">
                        <button className="btn-icon view-btn" title="View Info">
                          View
                        </button>
                        <button
                          className={`btn-icon edit-btn admin-only ${!isAdmin ? "disabled-btn" : ""}`}
                          title={isAdmin ? "Edit Account" : "Restricted: Admin Access Required"}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn-icon delete-btn admin-only ${!isAdmin ? "disabled-btn" : ""}`}
                          title={isAdmin ? "Delete Account" : "Restricted: Admin Access Required"}
                          onClick={() => handleDelete(member.id, member.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="content-lower">
                <div className="lower-left widget-card">
                  <h2 className="lower-title">PM Quick Broadcast</h2>
                  <p className="widget-desc">Send a reminder or announcement to all active LC members.</p>
                  <textarea className="broadcast-input" placeholder="Type your message here..."></textarea>
                  <button className="btn-action primary full-width" onClick={handleBroadcastSend}>
                    Send to All Members
                  </button>
                </div>
                <div className="lower-right widget-card">
                  <h2 className="lower-title">Monthly Team Tool Status</h2>
                  <ul className="dept-list">
                    {DEPT_STATUS.map((dept) => (
                      <li key={dept.name}>
                        <span>{dept.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={dept.ratioStyle}>{dept.ratio}</span>
                          <span className={`status-pill ${dept.pill}`}>{dept.pillLabel}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
