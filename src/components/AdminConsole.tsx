"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ClientOrganization } from "@/lib/types";
import { ModalProvider } from "./Modal";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}/mo`;
}

export default function AdminConsole({ initialOrgs }: { initialOrgs: ClientOrganization[] }) {
  return (
    <ModalProvider>
      <AdminConsoleInner initialOrgs={initialOrgs} />
    </ModalProvider>
  );
}

function AdminConsoleInner({ initialOrgs }: { initialOrgs: ClientOrganization[] }) {
  const [orgs, setOrgs] = useState<ClientOrganization[]>(initialOrgs);
  const [showForm, setShowForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [propertyLimit, setPropertyLimit] = useState("30");
  const [monthlyPrice, setMonthlyPrice] = useState("100");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ orgName: string; ownerEmail: string; tempPassword: string } | null>(null);

  async function handleCreate() {
    if (!orgName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      setError("Business name, owner name, and owner email are all required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const result = await api("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          orgName: orgName.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          propertyLimit: Number(propertyLimit),
          monthlyPriceCents: Math.round(Number(monthlyPrice) * 100),
          notes: notes.trim(),
        }),
      });
      setOrgs((os) => [result, ...os]);
      setCreated({ orgName: orgName.trim(), ownerEmail: result.ownerEmail, tempPassword: result.tempPassword });
      setOrgName(""); setOwnerName(""); setOwnerEmail(""); setNotes("");
      setPropertyLimit("30"); setMonthlyPrice("100");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create business account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const updated = await api(`/api/admin/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setOrgs((os) => os.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
  }

  return (
    <div className="wrap">
      <div className="header-row">
        <div>
          <h1>BAB Tasker &mdash; Admin</h1>
          <p className="sub">Manage your customer businesses and their plans.</p>
        </div>
        <div className="viewer-badge">
          <div>Viewing as <b>Super Admin</b></div>
          <Link className="link-btn" href="/change-password">Change password</Link>
          {" · "}
          <button className="link-btn" onClick={() => signOut({ redirectTo: "/login" })}>Sign out</button>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => { setShowForm((v) => !v); setCreated(null); }}>
          {showForm ? "Cancel" : "+ Add Business"}
        </button>
      </div>

      {created && (
        <div className="temp-pw-box" style={{ marginBottom: 16 }}>
          Account created for <b>{created.orgName}</b>. Owner login: <code>{created.ownerEmail}</code>
          <br />Temporary password: <code>{created.tempPassword}</code>
          <br />Send this to them directly &mdash; they&apos;ll set their own password on first login.
        </div>
      )}

      {showForm && (
        <div className="panel">
          <h3>Add a Business</h3>
          <div className="grid2">
            <div className="field"><label>Business name</label><input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Acme Cleaning Co" /></div>
            <div className="field"><label>Owner name</label><input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
          </div>
          <div className="field"><label>Owner email (used to log in)</label><input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} /></div>
          <div className="grid2">
            <div className="field"><label>Property limit</label><input type="text" inputMode="numeric" value={propertyLimit} onChange={(e) => setPropertyLimit(e.target.value)} /></div>
            <div className="field"><label>Monthly price (USD)</label><input type="text" inputMode="numeric" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} /></div>
          </div>
          <div className="field"><label>Notes (internal only)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. how you met them, deal terms" /></div>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-actions">
            <button className="btn" disabled={saving} onClick={handleCreate}>{saving ? "Creating…" : "Create Business Account"}</button>
          </div>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="empty">No businesses yet. Add your first one above.</div>
      ) : (
        orgs.map((o) => (
          <div className="emp-card" key={o.id}>
            <div>
              <div className="emp-name">
                {o.name}
                <span className="str-pill" style={
                  o.status === "SUSPENDED"
                    ? { background: "var(--damage-bg)", color: "var(--damage-text)", border: "1px solid var(--damage-border)" }
                    : o.status === "TRIAL"
                    ? { background: "var(--str-bg)", color: "var(--str-text)", border: "1px solid var(--str-border)" }
                    : undefined
                }>{o.status}</span>
              </div>
              <div className="emp-contact">
                {formatPrice(o.monthlyPriceCents)} &middot; up to {o.propertyLimit} properties &middot; {o.jobCount ?? 0} in use &middot; {o.userCount ?? 0} account{o.userCount === 1 ? "" : "s"}
              </div>
              {o.notes && <div className="emp-count">{o.notes}</div>}
            </div>
            <div className="emp-actions">
              {o.status !== "ACTIVE" && <button className="btn secondary small" onClick={() => handleStatusChange(o.id, "ACTIVE")}>Activate</button>}
              {o.status !== "SUSPENDED" && <button className="btn danger small" onClick={() => handleStatusChange(o.id, "SUSPENDED")}>Suspend</button>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
