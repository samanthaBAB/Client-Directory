"use client";

import { useState } from "react";
import { ClientEmployee, ClientVisit, Role } from "@/lib/types";
import Calendar from "./Calendar";
import { useModal } from "./Modal";

interface Props {
  employees: ClientEmployee[];
  currentRole: Role;
  onAddEmployee: (name: string, email: string, phone: string) => Promise<string>; // returns temp password
  onToggleAdmin: (id: string, makeAdmin: boolean) => Promise<void>;
  onUpdatePayRate: (id: string, payoutPercent: number, payoutFlatFee: number) => Promise<void>;
  onResetPassword: (id: string) => Promise<string>; // returns temp password
  onRemoveEmployee: (id: string) => Promise<void>;
  fetchVisitsForEmployee: (id: string) => Promise<ClientVisit[]>;
}

function describeRate(e: ClientEmployee) {
  if (e.payoutPercent == null || e.payoutFlatFee == null) return "No payout rate set";
  return `${e.payoutPercent}% off price, minus $${e.payoutFlatFee}`;
}

export default function EmployeesPanel({
  employees, currentRole, onAddEmployee, onToggleAdmin, onUpdatePayRate, onResetPassword, onRemoveEmployee, fetchVisitsForEmployee,
}: Props) {
  const modal = useModal();
  const canManageAdmins = currentRole === "OWNER";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tempPw, setTempPw] = useState<{ name: string; password: string } | null>(null);
  const [activityEmployee, setActivityEmployee] = useState<ClientEmployee | null>(null);
  const [activityVisits, setActivityVisits] = useState<ClientVisit[]>([]);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState({ percent: "25", flatFee: "5" });
  const [savingRate, setSavingRate] = useState(false);

  async function handleAdd() {
    if (!name.trim()) { setError("Please enter a name."); return; }
    if (!email.trim()) { setError("Please enter an email."); return; }
    setError("");
    setSaving(true);
    try {
      const password = await onAddEmployee(name.trim(), email.trim(), phone.trim());
      setTempPw({ name: name.trim(), password });
      setName(""); setEmail(""); setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee.");
    } finally {
      setSaving(false);
    }
  }

  async function openActivity(emp: ClientEmployee) {
    setActivityEmployee(emp);
    const visits = await fetchVisitsForEmployee(emp.id);
    setActivityVisits(visits);
  }

  function openRateEditor(e: ClientEmployee) {
    setEditingRateId(e.id);
    setRateDraft({
      percent: e.payoutPercent != null ? String(e.payoutPercent) : "25",
      flatFee: e.payoutFlatFee != null ? String(e.payoutFlatFee) : "5",
    });
  }

  async function saveRate(id: string) {
    const percent = parseFloat(rateDraft.percent);
    const flatFee = parseFloat(rateDraft.flatFee);
    if (Number.isNaN(percent) || Number.isNaN(flatFee)) return;
    setSavingRate(true);
    try {
      await onUpdatePayRate(id, percent, flatFee);
      setEditingRateId(null);
    } finally {
      setSavingRate(false);
    }
  }

  return (
    <div>
      <div className="panel">
        <h3>Add Employee</h3>
        <div className="grid2">
          <div className="field"><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>Email (used to log in)</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="field"><label>Phone (for text notifications)</label><input type="tel" placeholder="+13375551234" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-actions"><button className="btn" disabled={saving} onClick={handleAdd}>{saving ? "Adding…" : "Add Employee"}</button></div>
        {tempPw && (
          <div className="temp-pw-box">
            Account created for <b>{tempPw.name}</b>. Temporary password: <code>{tempPw.password}</code>
            <br />Share this with them directly &mdash; they&apos;ll be asked to set their own password on first login.
            <br />Their payout rate defaults to <b>25% off price, minus $5</b> &mdash; adjust it below if this cleaner is different.
          </div>
        )}
      </div>

      {employees.length === 0 && <div className="empty">No employees added yet.</div>}
      {employees.map((e) => (
        <div className="emp-card" key={e.id}>
          <div>
            <div className="emp-name">
              {e.name}
              {e.role === "ADMIN" && <span className="str-pill">Administrator</span>}
            </div>
            <div className="emp-contact">{e.email}{e.phone ? ` · ${e.phone}` : ""}</div>
            <div className="emp-count">{e.jobCount} job{e.jobCount === 1 ? "" : "s"} assigned</div>
            <div className="emp-count">{describeRate(e)}</div>
          </div>
          <div className="emp-actions">
            <button className="btn secondary small" onClick={() => openRateEditor(e)}>Edit Pay Rate</button>
            <button className="btn secondary small" onClick={async () => {
              const password = await onResetPassword(e.id);
              setTempPw({ name: e.name, password });
            }}>Reset Password</button>
            {canManageAdmins && (
              <button className="btn secondary small" onClick={() => onToggleAdmin(e.id, e.role !== "ADMIN")}>
                {e.role === "ADMIN" ? "Remove Admin" : "Make Admin"}
              </button>
            )}
            <button className="btn secondary small" onClick={() => openActivity(e)}>View Activity</button>
            {canManageAdmins && (
              <button className="btn danger small" onClick={async () => {
                if (await modal.confirm("Remove this employee? Their jobs will become unassigned.")) onRemoveEmployee(e.id);
              }}>Remove</button>
            )}
          </div>

          {editingRateId === e.id && (
            <div className="visit-form">
              <p style={{ margin: "0 0 8px", fontSize: 13.5, color: "var(--text-secondary)" }}>
                Their payout is calculated automatically: price, minus this percent, minus this flat fee, rounded up to the nearest dollar.
              </p>
              <div className="grid2">
                <div className="field">
                  <label>Percent off price</label>
                  <input type="number" step="0.1" min="0" max="100" value={rateDraft.percent} onChange={(ev) => setRateDraft((r) => ({ ...r, percent: ev.target.value }))} />
                </div>
                <div className="field">
                  <label>Flat fee ($)</label>
                  <input type="number" step="0.01" min="0" value={rateDraft.flatFee} onChange={(ev) => setRateDraft((r) => ({ ...r, flatFee: ev.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn small" disabled={savingRate} onClick={() => saveRate(e.id)}>{savingRate ? "Saving…" : "Save Rate"}</button>
                <button className="btn secondary small" onClick={() => setEditingRateId(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {activityEmployee && (
        <div className="panel">
          <div className="cal-header">
            <h3 style={{ margin: 0 }}>{activityEmployee.name} &mdash; Activity</h3>
            <button className="btn secondary small" onClick={() => setActivityEmployee(null)}>Close</button>
          </div>
          <Calendar visits={activityVisits} />
        </div>
      )}
    </div>
  );
}
