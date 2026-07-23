"use client"

import { useRef, useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportRow {
  firstName: string; lastName: string; email: string
  idNumber: string; birthdate: string; department: string
  subDepartment: string; role: string; password: string
}

interface ValidatedRow extends ImportRow {
  rowIndex: number; errors: string[]; valid: boolean
}

interface ImportResult {
  created: number; total: number
  failed: { row: number; email: string; error: string }[]
}

type Step = "upload" | "preview" | "confirm" | "done"

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const cells: string[] = []
  let cell = "", inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cell += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) { cells.push(cell.trim()); cell = '' }
    else cell += c
  }
  cells.push(cell.trim())
  return cells
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h.trim()] = vals[i] ?? '' })
    return obj as unknown as ImportRow
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBulkImport() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,        setStep]        = useState<Step>("upload")
  const [validated,   setValidated]   = useState<ValidatedRow[]>([])
  const [result,      setResult]      = useState<ImportResult | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState(false)

  const validCount = validated.filter(r =>  r.valid).length
  const errorCount = validated.filter(r => !r.valid).length

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file."); return
    }
    setError(null); setLoading(true)
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) { setError("The CSV file has no data rows."); return }
      const res  = await fetch("/api/admin/bulk-import/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Validation failed")
      setValidated(data.rows); setStep("preview")
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleConfirm() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch("/api/admin/bulk-import/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validated.filter(r => r.valid) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      setResult(data); setStep("done")
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  function reset() {
    setStep("upload"); setValidated([]); setResult(null); setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  // ── Step indicator labels ──────────────────────────────────────────────────
  const STEPS: { key: Step; label: string }[] = [
    { key: "upload",  label: "Upload CSV" },
    { key: "preview", label: "Preview & Validate" },
    { key: "confirm", label: "Confirm" },
    { key: "done",    label: "Done" },
  ]
  const stepIdx = STEPS.findIndex(s => s.key === step)

  return (
    <div className="content-table" style={{ padding: 0 }}>
      <style>{BI_CSS}</style>

      {/* Step bar */}
      <div className="bi-stepbar">
        {STEPS.map((st, i) => (
          <div key={st.key} className={`bi-step${i === stepIdx ? " active" : i < stepIdx ? " done" : ""}`}>
            <span className="bi-step-num">{i < stepIdx ? "✓" : i + 1}</span>
            {st.label}
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 28px" }}>
        {error && <div className="bi-error">{error}</div>}

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <>
            <p style={{ color: "var(--text-sub)", fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>
              Download the template, fill in your member roster, then upload the completed CSV.
              Rows with duplicate or already-existing emails / ID numbers will be flagged before anything is saved.
            </p>

            <a href="/api/admin/bulk-import/template" download className="btn-action secondary" style={{ display: "inline-block", textDecoration: "none", marginBottom: 24 }}>
              ↓ Download Template
            </a>

            <div
              className={`bi-dropzone${dragOver ? " drag-over" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            >
              {loading ? (
                <p style={{ color: "var(--text-sub)" }}>Validating rows…</p>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Click or drag &amp; drop your CSV</p>
                  <p style={{ color: "var(--text-sub)", fontSize: 13 }}>.csv files only</p>
                </>
              )}
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </div>

            <div className="bi-hint">
              <strong>Required columns:</strong>
              <code style={{ display: "block", marginTop: 6, fontSize: 12, lineHeight: 1.8, color: "var(--text-color)" }}>
                firstName, lastName, email, idNumber, birthdate, department, subDepartment, role, password
              </code>
              <p style={{ marginTop: 8, color: "var(--text-sub)", fontSize: 13 }}>
                Leave <code>password</code> blank to use the default (<code>Password123!</code>).
                Email must end in @aiesec.ph. Birthdate format: YYYY-MM-DD.
              </p>
            </div>
          </>
        )}

        {/* ── Step 2: Preview ── */}
        {step === "preview" && (
          <>
            <div className="bi-row" style={{ marginBottom: 14 }}>
              <div>
                <span style={{ fontWeight: 600, color: "#16a34a" }}>{validCount} valid</span>
                <span style={{ color: "var(--text-sub)", margin: "0 8px" }}>·</span>
                <span style={{ fontWeight: errorCount > 0 ? 600 : 400, color: errorCount > 0 ? "#b91c1c" : "var(--text-sub)" }}>
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </span>
                <span style={{ color: "var(--text-sub)", margin: "0 8px" }}>·</span>
                <span style={{ color: "var(--text-sub)" }}>{validated.length} total</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-action secondary" onClick={reset}>← Re-upload</button>
                {validCount > 0 && (
                  <button className="btn-action primary" onClick={() => setStep("confirm")}>Continue →</button>
                )}
              </div>
            </div>

            {errorCount > 0 && (
              <div className="bi-warn">
                {errorCount} row{errorCount !== 1 ? "s have" : " has"} errors and will be skipped.
                Fix them in your CSV and re-upload, or proceed to import only the {validCount} valid row{validCount !== 1 ? "s" : ""}.
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table className="bi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department / Sub-dept</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validated.map(row => (
                    <tr key={row.rowIndex} className={row.valid ? "row-ok" : "row-err"}>
                      <td style={{ color: "var(--text-sub)" }}>{row.rowIndex + 1}</td>
                      <td>{row.firstName} {row.lastName}</td>
                      <td style={{ fontSize: 12 }}>{row.email}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{row.department || <em style={{ color: "var(--text-sub)" }}>—</em>}</span>
                        {row.subDepartment && <><br /><span style={{ color: "var(--text-sub)", fontSize: 12 }}>{row.subDepartment}</span></>}
                      </td>
                      <td>{row.role || "—"}</td>
                      <td>
                        {row.valid ? (
                          <span className="status-pill success" style={{ fontSize: 11 }}>Valid</span>
                        ) : (
                          <>
                            <span className="status-pill danger" style={{ fontSize: 11 }}>Error</span>
                            <ul className="bi-err-list">
                              {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === "confirm" && (
          <>
            <p style={{ color: "var(--text-sub)", fontSize: 14, marginBottom: 20 }}>
              You&apos;re about to create <strong>{validCount} member account{validCount !== 1 ? "s" : ""}</strong>.
              {errorCount > 0 && ` ${errorCount} row${errorCount !== 1 ? "s" : ""} with errors will be skipped.`}
            </p>

            <div className="bi-summary-grid" style={{ marginBottom: 20 }}>
              <div className="bi-summary-cell green">
                <div className="bi-summary-num">{validCount}</div>
                <div className="bi-summary-label">Members to Create</div>
              </div>
              {errorCount > 0 && (
                <div className="bi-summary-cell red">
                  <div className="bi-summary-num">{errorCount}</div>
                  <div className="bi-summary-label">Rows Skipped</div>
                </div>
              )}
            </div>

            <div className="bi-info" style={{ marginBottom: 20 }}>
              Members with a blank password will be assigned: <code>Password123!</code>
            </div>

            {error && <div className="bi-error">{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-action secondary" onClick={() => setStep("preview")} disabled={loading}>← Back</button>
              <button className="btn-action primary" onClick={handleConfirm} disabled={loading}>
                {loading ? "Importing…" : `Import ${validCount} Member${validCount !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && result && (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 48 }}>{result.failed.length === 0 ? "🎉" : "⚠️"}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 10, marginBottom: 6 }}>
                Import {result.failed.length === 0 ? "Complete" : "Finished with Issues"}
              </h3>
              <p style={{ color: "var(--text-sub)" }}>
                {result.created} of {result.total} account{result.total !== 1 ? "s" : ""} created successfully.
              </p>
            </div>

            <div className="bi-summary-grid" style={{ marginBottom: 24 }}>
              <div className="bi-summary-cell green">
                <div className="bi-summary-num">{result.created}</div>
                <div className="bi-summary-label">Accounts Created</div>
              </div>
              {result.failed.length > 0 && (
                <div className="bi-summary-cell red">
                  <div className="bi-summary-num">{result.failed.length}</div>
                  <div className="bi-summary-label">Failed</div>
                </div>
              )}
            </div>

            {result.failed.length > 0 && (
              <>
                <h4 style={{ fontWeight: 600, marginBottom: 10 }}>Failed Rows</h4>
                <div style={{ overflowX: "auto", marginBottom: 20 }}>
                  <table className="bi-table">
                    <thead>
                      <tr><th>Row #</th><th>Email</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {result.failed.map((f, i) => (
                        <tr key={i} className="row-err">
                          <td>{f.row + 1}</td>
                          <td>{f.email}</td>
                          <td style={{ color: "#b91c1c" }}>{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-action secondary" onClick={reset}>Import Another File</button>
              <button className="btn-action primary" onClick={() => window.location.href = "/admin?tab=members"}>
                View Members
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Scoped styles ────────────────────────────────────────────────────────────

const BI_CSS = `
.bi-stepbar { display: flex; border-bottom: 1px solid var(--border-color); background: var(--sidebar-bg); padding: 12px 28px; gap: 0; }
.bi-step { display: flex; align-items: center; gap: 7px; padding: 0 18px; font-size: 13px; font-weight: 500; color: var(--text-sub); position: relative; }
.bi-step:first-child { padding-left: 0; }
.bi-step:not(:last-child)::after { content: '›'; position: absolute; right: 0; color: var(--border-color); font-size: 15px; }
.bi-step.active { color: var(--primary-blue); }
.bi-step.done   { color: #16a34a; }
.bi-step-num { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; background: var(--border-color); color: var(--text-sub); flex-shrink: 0; }
.bi-step.active .bi-step-num { background: var(--primary-blue); color: #fff; }
.bi-step.done   .bi-step-num { background: #16a34a; color: #fff; }

.bi-dropzone { border: 2px dashed var(--border-color); border-radius: 10px; padding: 44px 24px; text-align: center; cursor: pointer; transition: all 0.15s; margin-bottom: 0; }
.bi-dropzone:hover, .bi-dropzone.drag-over { border-color: var(--primary-blue); background: #eff6ff; }

.bi-hint { background: var(--secondary-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px; margin-top: 20px; font-size: 13px; }
.bi-error { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; color: #b91c1c; margin-bottom: 14px; font-size: 14px; }
.bi-warn  { background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 10px 14px; color: #854d0e; margin-bottom: 14px; font-size: 13px; }
.bi-info  { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; color: #92400e; font-size: 13px; }

.bi-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }

.bi-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
.bi-summary-cell { border-radius: 10px; padding: 18px; text-align: center; }
.bi-summary-cell.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
.bi-summary-cell.red   { background: #fef2f2; border: 1px solid #fecaca; }
.bi-summary-num { font-size: 32px; font-weight: 700; }
.bi-summary-cell.green .bi-summary-num { color: #15803d; }
.bi-summary-cell.red   .bi-summary-num { color: #b91c1c; }
.bi-summary-label { font-weight: 600; font-size: 13px; margin-top: 4px; }
.bi-summary-cell.green .bi-summary-label { color: #16a34a; }
.bi-summary-cell.red   .bi-summary-label { color: #dc2626; }

.bi-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bi-table th { background: var(--secondary-bg); padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--border-color); font-weight: 600; color: var(--text-sub); white-space: nowrap; }
.bi-table td { padding: 9px 12px; border-bottom: 1px solid var(--secondary-bg); vertical-align: top; }
.bi-table tr.row-ok:hover td { background: #f0fdf4; }
.bi-table tr.row-err td       { background: #fff9fa; }
.bi-table tr.row-err:hover td { background: #fef2f2; }

.bi-err-list { margin: 4px 0 0; padding: 0; list-style: none; }
.bi-err-list li { color: #b91c1c; font-size: 11px; margin-top: 2px; }
.bi-err-list li::before { content: '• '; }

.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
`
