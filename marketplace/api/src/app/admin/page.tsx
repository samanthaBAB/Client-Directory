"use client";

import React, { useCallback, useEffect, useState } from "react";

type Job = {
  id: string;
  serviceType: string;
  scheduledFor: string;
  priceCents: number;
  status: string;
  address: { city: string; state: string };
  homeowner: { user: { name: string; email: string } };
  cleaner: { user: { name: string; email: string } } | null;
  payment: { status: string } | null;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "HOMEOWNER" | "CLEANER";
  createdAt: string;
  cleaner: {
    stripeOnboarded: boolean;
    ratingAvg: number | null;
    ratingCount: number;
    serviceRadiusMi: number;
  } | null;
};

type Payment = {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  jobRequest: {
    serviceType: string;
    homeowner: { user: { name: string } };
    cleaner: { user: { name: string } } | null;
  };
};

const TOKEN_KEY = "cleaning-marketplace-admin-token";
const JOB_STATUSES = ["", "PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELED"];
const NON_TERMINAL = new Set(["PENDING", "ACCEPTED", "IN_PROGRESS"]);

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function apiFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `Request failed (${res.status})`);
  return data as T;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setCheckedStorage(true);
  }, []);

  if (!checkedStorage) return null;
  return token ? (
    <Dashboard token={token} onLogout={() => { localStorage.removeItem(TOKEN_KEY); setToken(null); }} />
  ) : (
    <Login onLogin={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : "Login failed");
      if (data.user.role !== "ADMIN") throw new Error("This account isn't an admin account.");
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={onSubmit} style={styles.loginBox}>
        <h1 style={styles.h1}>Admin</h1>
        <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"jobs" | "users" | "payments">("jobs");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Cleaning Marketplace — Admin</h1>
        <button style={styles.linkButton} onClick={onLogout}>
          Sign out
        </button>
      </div>
      <div style={styles.tabs}>
        {(["jobs", "users", "payments"] as const).map((t) => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "jobs" && <JobsTab token={token} />}
      {tab === "users" && <UsersTab token={token} />}
      {tab === "payments" && <PaymentsTab token={token} />}
    </div>
  );
}

function JobsTab({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = status ? `?status=${status}` : "";
      setJobs(await apiFetch<Job[]>(`/api/admin/jobs${qs}`, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function onForceCancel(job: Job) {
    if (!confirm(`Cancel this ${job.serviceType} job? A successful payment will be refunded in full.`)) return;
    try {
      await apiFetch(`/api/admin/jobs/${job.id}/force-cancel`, token, { method: "POST" });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div>
      <div style={styles.toolbar}>
        <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Service</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Scheduled</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Homeowner</th>
              <th style={styles.th}>Cleaner</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td style={styles.td}>{j.serviceType}</td>
                <td style={styles.td}>
                  {j.address.city}, {j.address.state}
                </td>
                <td style={styles.td}>{new Date(j.scheduledFor).toLocaleString()}</td>
                <td style={styles.td}>{j.status}</td>
                <td style={styles.td}>{j.homeowner.user.name}</td>
                <td style={styles.td}>{j.cleaner?.user.name ?? "—"}</td>
                <td style={styles.td}>{money(j.priceCents)}</td>
                <td style={styles.td}>{j.payment?.status ?? "—"}</td>
                <td style={styles.td}>
                  {NON_TERMINAL.has(j.status) && (
                    <button style={styles.linkButton} onClick={() => onForceCancel(j)}>
                      Force cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={9}>
                  No jobs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminUser[]>("/api/admin/users", token)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p>Loading…</p>;

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Email</th>
          <th style={styles.th}>Role</th>
          <th style={styles.th}>Phone</th>
          <th style={styles.th}>Cleaner status</th>
          <th style={styles.th}>Joined</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td style={styles.td}>{u.name}</td>
            <td style={styles.td}>{u.email}</td>
            <td style={styles.td}>{u.role}</td>
            <td style={styles.td}>{u.phone ?? "—"}</td>
            <td style={styles.td}>
              {u.cleaner
                ? `${u.cleaner.stripeOnboarded ? "Onboarded" : "Not onboarded"} · ${
                    u.cleaner.ratingAvg ? u.cleaner.ratingAvg.toFixed(1) : "—"
                  }★ (${u.cleaner.ratingCount}) · ${u.cleaner.serviceRadiusMi}mi`
                : "—"}
            </td>
            <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentsTab({ token }: { token: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Payment[]>("/api/admin/payments", token)
      .then(setPayments)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p>Loading…</p>;

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Service</th>
          <th style={styles.th}>Homeowner</th>
          <th style={styles.th}>Cleaner</th>
          <th style={styles.th}>Amount</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Date</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p.id}>
            <td style={styles.td}>{p.jobRequest.serviceType}</td>
            <td style={styles.td}>{p.jobRequest.homeowner.user.name}</td>
            <td style={styles.td}>{p.jobRequest.cleaner?.user.name ?? "—"}</td>
            <td style={styles.td}>{money(p.amountCents)}</td>
            <td style={styles.td}>{p.status}</td>
            <td style={styles.td}>{new Date(p.createdAt).toLocaleString()}</td>
          </tr>
        ))}
        {payments.length === 0 && (
          <tr>
            <td style={styles.td} colSpan={6}>
              No payments yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "system-ui, sans-serif",
    background: "#12141c",
    color: "#e6e6ee",
    minHeight: "100vh",
    padding: 24,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  h1: { fontSize: 20, fontWeight: 700, margin: 0 },
  loginBox: {
    maxWidth: 320,
    margin: "80px auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#1c1f2a",
    color: "#e6e6ee",
    fontSize: 15,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#4c6ef5",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#7d94ff",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
  },
  error: { color: "#ff6b6b", fontSize: 14 },
  tabs: { display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #262a38" },
  tab: {
    padding: "8px 16px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#9a9dab",
    cursor: "pointer",
    fontSize: 14,
  },
  tabActive: { color: "#fff", borderBottom: "2px solid #4c6ef5" },
  toolbar: { marginBottom: 12 },
  select: {
    padding: 8,
    borderRadius: 6,
    border: "1px solid #333",
    background: "#1c1f2a",
    color: "#e6e6ee",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #262a38", color: "#9a9dab" },
  td: { padding: "8px 10px", borderBottom: "1px solid #1c1f2a" },
};
