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
  onResetPassword: (id: string) => Promise<string>; // returns temp password
  onRemoveEmployee: (id: string) => Promise<void>;
  fetchVisitsForEmployee: (id: string) => Promise<ClientVisit[]>;
}

export default function EmployeesPanel({
  employees, currentRole, onAddEmployee, onToggleAdmin, onResetPassword, onRemoveEmployee, fetchVisitsForEmployee,
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
          </div>
          <div className="emp-actions">
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
