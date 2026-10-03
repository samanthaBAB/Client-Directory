"use client";

import { useEffect, useState } from "react";
import { ClientVisit } from "@/lib/types";

interface EmployeeTotals {
  employeeId: string;
  employeeName: string;
  paid: number;
  unpaid: number;
  unrecorded: number;
  visits: ClientVisit[];
}

interface PayrollData {
  year: string;
  employees: EmployeeTotals[];
  totals: { paid: number; unpaid: number; unrecorded: number };
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(String);

export default function PayrollPanel({
  onSetVisitPaid,
}: {
  onSetVisitPaid: (visitId: string, paid: boolean) => Promise<void>;
}) {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [busyVisitId, setBusyVisitId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?year=${year}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading payroll for the selected year
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function togglePaid(visitId: string, paid: boolean) {
    setBusyVisitId(visitId);
    try {
      await onSetVisitPaid(visitId, paid);
      await load();
    } finally {
      setBusyVisitId(null);
    }
  }

  return (
    <div>
      <div className="panel">
        <h3>Payroll — {year}</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--text-secondary)" }}>
          Totals come from completed visits. Each visit&apos;s payout is captured
          the moment it&apos;s completed, so changing an employee&apos;s pay rate
          later won&apos;t rewrite past totals.
        </p>
        <div className="toolbar">
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {data && (
          <div className="grid3">
            <div className="field">
              <label>Paid</label>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{money(data.totals.paid)}</div>
            </div>
            <div className="field">
              <label>Unpaid</label>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--str-text)" }}>{money(data.totals.unpaid)}</div>
            </div>
            <div className="field">
              <label>No payout recorded</label>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-muted)" }}>{data.totals.unrecorded}</div>
            </div>
          </div>
        )}
      </div>

      {loading && <div className="empty">Loading…</div>}
      {!loading && data && data.employees.length === 0 && (
        <div className="empty">No completed visits logged for {year} yet.</div>
      )}

      {!loading && data?.employees.map((emp) => {
        const open = openEmployeeId === emp.employeeId;
        return (
          <div className="emp-card" key={emp.employeeId} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="job-top">
              <div>
                <div className="emp-name">{emp.employeeName}</div>
                <div className="emp-count">
                  Paid {money(emp.paid)} · Unpaid {money(emp.unpaid)}
                  {emp.unrecorded > 0 ? ` · ${emp.unrecorded} with no payout recorded` : ""}
                </div>
              </div>
              <button className="btn secondary small" onClick={() => setOpenEmployeeId(open ? null : emp.employeeId)}>
                {open ? "Hide visits" : "View visits"}
              </button>
            </div>

            {open && (
              <div style={{ marginTop: 10 }}>
                {emp.visits.map((v) => (
                  <div className="visit-item" key={v.id}>
                    <div className="job-top">
                      <div>
                        <div className="vname">{v.jobLabel}</div>
                        <div className="vnote">
                          {v.date}
                          {v.payoutAmount != null ? ` · ${money(v.payoutAmount)}` : " · no payout recorded"}
                        </div>
                      </div>
                      {v.payoutAmount != null && (
                        <button
                          className={`btn small ${v.payoutPaid ? "secondary" : ""}`}
                          disabled={busyVisitId === v.id}
                          onClick={() => togglePaid(v.id, !v.payoutPaid)}
                        >
                          {busyVisitId === v.id ? "…" : v.payoutPaid ? "Mark Unpaid" : "Mark Paid"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
