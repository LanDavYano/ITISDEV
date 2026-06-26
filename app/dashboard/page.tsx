"use client"

import { useEffect } from "react"

export default function DashboardPage() {
  useEffect(() => {
    const noteItems = Array.from(document.querySelectorAll<HTMLDivElement>(".note-item"))

    const handlers = noteItems.map((item) => {
      const radio = item.querySelector<HTMLDivElement>(".custom-radio")
      const handler = () => {
        item.classList.toggle("completed")
        if (item.classList.contains("completed")) {
          if (radio) radio.innerHTML = '<i class="fa-solid fa-check"></i>'
        } else {
          if (radio) radio.innerHTML = ""
        }
      }

      radio?.addEventListener("click", handler)
      return { radio, handler }
    })

    return () => {
      handlers.forEach(({ radio, handler }) => radio?.removeEventListener("click", handler))
    }
  }, [])

  return (
    <div className="imported-dashboard">
      <div className="dashboard-body">
        <section className="welcome-section">
          <div className="date-text">Term 26.27 | Quarter 1</div>
          <div className="greeting-header">
            <h1>Good Evening, AIESECer!</h1>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-outline"><i className="fa-solid fa-download"></i> Export MoS Report</button>
            </div>
          </div>
        </section>

        <div className="alert-banner">
          <div className="alert-content">
            <div className="alert-icon"><i className="fa-solid fa-circle-exclamation"></i></div>
            <div className="alert-text">
              <h4>Action Required: Initial LDA Submission</h4>
              <p>Your Leadership Development Assessment is pending. Deadline for all Local Committee members is June 25, 2026.</p>
            </div>
          </div>
          <button className="btn-primary" style={{ backgroundColor: "#f59e0b", color: "white" }}>Take LDA Now</button>
        </div>

        <div className="stats-row" style={{ marginBottom: 24, width: "100%", justifyContent: "space-between" }}>
          <div className="stat-item">
            <i className="fa-solid fa-bullseye" style={{ color: "#f59e0b" }}></i>
            <span><strong>85%</strong> MoS Achieved</span>
          </div>
          <div className="stat-item">
            <i className="fa-solid fa-plane-departure" style={{ color: "var(--accent-green)" }}></i>
            <span><strong>14</strong> oGV Approvals</span>
          </div>
          <div className="stat-item">
            <i className="fa-solid fa-user-clock" style={{ color: "var(--accent-pink)" }}></i>
            <span><strong>3</strong> EPs to Contact</span>
          </div>
        </div>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <i className="fa-solid fa-chart-column" style={{ color: "var(--text-muted)" }}></i> MoS Achievement Trend (oGV Approvals)
            </div>
            <button className="btn-outline" style={{ padding: "4px 12px", fontSize: 12 }}>2026 <i className="fa-solid fa-chevron-down"></i></button>
          </div>

          <div className="chart-container">
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "40%" }}><span className="chart-score">4</span></div>
              <span className="chart-label">Jan</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "60%" }}><span className="chart-score">6</span></div>
              <span className="chart-label">Feb</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "80%" }}><span className="chart-score">8</span></div>
              <span className="chart-label">Mar</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "50%" }}><span className="chart-score">5</span></div>
              <span className="chart-label">Apr</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "100%", backgroundColor: "var(--primary-blue)" }}><span className="chart-score">10</span></div>
              <span className="chart-label" style={{ color: "var(--text-main)", fontWeight: 700 }}>May</span>
            </div>
            <div className="chart-bar-group">
              <div className="chart-bar" style={{ height: "10%", backgroundColor: "var(--border-color)", border: "1px dashed #999" }}><span className="chart-score">--</span></div>
              <span className="chart-label">Jun</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title"><i className="fa-regular fa-folder-open"></i> Pending Deliverables & LC Tracking</div>
          </div>

          <div className="notes-list">
            <div className="note-item">
              <div className="custom-radio"></div>
              <div className="note-content" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h4>EP Consultation Call: Sarah Jenkins</h4>
                  <span className="status-pill status-pending">Overdue</span>
                </div>
                <p>Conduct an initial consultation to align expectations for the Global Volunteer project in Brazil.</p>
                <div className="deliverable-meta">
                  <span className="urgent-text"><i className="fa-regular fa-clock"></i> SLA: Breached by 24hrs</span>
                  <span><i className="fa-solid fa-tag"></i> Operations</span>
                </div>
              </div>
            </div>

            <div className="note-item">
              <div className="custom-radio"></div>
              <div className="note-content" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h4>Submit Monthly Functional Review</h4>
                  <span className="status-pill status-progress">Requires Action</span>
                </div>
                <p>Update your goal tracking sheet for the upcoming EB & Member sync.</p>
                <div className="deliverable-meta">
                  <span><i className="fa-regular fa-clock"></i> Due: June 25, 2026</span>
                  <span><i className="fa-solid fa-tag"></i> Talent Management</span>
                </div>
              </div>
            </div>

            <div className="note-item completed">
              <div className="custom-radio"><i className="fa-solid fa-check"></i></div>
              <div className="note-content" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <h4>Attend Local Committee Meeting (LCM)</h4>
                  <span className="status-pill status-completed">Completed</span>
                </div>
                <p>Attended the monthly all-hands sync and onboarding refresh.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
