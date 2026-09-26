"use client";

import { useState } from "react";
import { ClientEmployee, ClientJob, SERVICE_TYPES } from "@/lib/types";
import { describeRecurrence, ORDINAL_OPTIONS, WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/recurrence";
import { todayStr } from "@/lib/time";

export interface JobFormValues {
  customer: string;
  property: string;
  serviceType: string;
  address: string;
  city: string;
  state: string;
  price: string;
  payout: string;
  phone: string;
  schedule: string;
  recurrenceType: string;
  recurrenceDays: number[];
  recurrenceOrdinals: number[];
  recurrenceAnchor: string;
  startTime: string;
  endTime: string;
  sameDayCheckIn: boolean;
  accessCode: string;
  keyLocation: string;
  suppliesLocation: string;
  ownerNote: string;
  damageNote: string;
  notes: string;
  assignedTo: string;
}

function blankValues(job: ClientJob | null): JobFormValues {
  return {
    customer: job?.customer ?? "",
    property: job?.property ?? "",
    serviceType: job?.serviceType ?? "",
    address: job?.address ?? "",
    city: job?.city ?? "",
    state: job?.state ?? "",
    price: job?.price ?? "",
    payout: job?.payout ?? "",
    phone: job?.phone ?? "",
    schedule: job?.schedule ?? "",
    recurrenceType: job?.recurrenceType ?? "",
    recurrenceDays: job?.recurrenceDays ?? [],
    recurrenceOrdinals: job?.recurrenceOrdinals ?? [],
    recurrenceAnchor: job?.recurrenceAnchor ?? "",
    startTime: job?.startTime ?? "",
    endTime: job?.endTime ?? "",
    sameDayCheckIn: job?.sameDayCheckIn ?? false,
    accessCode: job?.accessCode ?? "",
    keyLocation: job?.keyLocation ?? "",
    suppliesLocation: job?.suppliesLocation ?? "",
    ownerNote: job?.ownerNote ?? "",
    damageNote: job?.damageNote ?? "",
    notes: job?.notes ?? "",
    assignedTo: job?.assignedTo ?? "",
  };
}

export default function JobForm({
  job,
  employees,
  onSave,
  onCancel,
}: {
  job: ClientJob | null;
  employees: ClientEmployee[];
  onSave: (values: JobFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<JobFormValues>(() => blankValues(job));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleDay(day: number) {
    setValues((v) => ({
      ...v,
      recurrenceDays: v.recurrenceDays.includes(day)
        ? v.recurrenceDays.filter((d) => d !== day)
        : [...v.recurrenceDays, day],
    }));
  }

  function toggleOrdinal(ord: number) {
    setValues((v) => ({
      ...v,
      recurrenceOrdinals: v.recurrenceOrdinals.includes(ord)
        ? v.recurrenceOrdinals.filter((o) => o !== ord)
        : [...v.recurrenceOrdinals, ord],
    }));
  }

  async function handleSave() {
    if (!values.customer.trim()) {
      setError("Please enter a customer name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({ ...values, schedule: describeRecurrence(values) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h3>{job ? "Edit Client" : "Add Client"}</h3>
      <div className="grid2">
        <div className="field">
          <label>Customer name</label>
          <input type="text" value={values.customer} onChange={(e) => set("customer", e.target.value)} />
        </div>
        <div className="field">
          <label>Property name (optional)</label>
          <input type="text" placeholder="e.g. Treehouse" value={values.property} onChange={(e) => set("property", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Service type</label>
        <select value={values.serviceType} onChange={(e) => set("serviceType", e.target.value)}>
          <option value="">Select a service type</option>
          {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid3">
        <div className="field"><label>Address</label><input type="text" value={values.address} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="field"><label>City</label><input type="text" value={values.city} onChange={(e) => set("city", e.target.value)} /></div>
        <div className="field"><label>State</label><input type="text" value={values.state} onChange={(e) => set("state", e.target.value)} /></div>
      </div>
      <div className="grid2">
        <div className="field">
          <label>Price (what the client pays)</label>
          <input type="text" placeholder="e.g. $100/clean" value={values.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div className="field"><label>Phone</label><input type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Cleaner payout</label>
        <input type="text" placeholder="e.g. $80/clean" value={values.payout} onChange={(e) => set("payout", e.target.value)} />
      </div>
      <div className="owner-box" style={{ marginTop: -4, marginBottom: 10, fontSize: 13.5 }}>
        Only the payout is ever shown to the cleaner &mdash; the price above stays private to you.
      </div>
      <div className="field">
        <label>How often does this job repeat? (optional &mdash; needed for it to show on the Calendar)</label>
        <select
          value={values.recurrenceType}
          onChange={(e) => set("recurrenceType", e.target.value)}
        >
          <option value="">Not scheduled / one-off, no set day</option>
          <option value="ONCE">One-time, on a specific date</option>
          <option value="DAILY_RANGE">Every day, across a date range (e.g. a multi-day job)</option>
          <option value="WEEKLY">Every week, on certain day(s)</option>
          <option value="BIWEEKLY">Every other week, on certain day(s)</option>
          <option value="MONTHLY_NTH">Certain week(s) of the month (e.g. 1st &amp; 3rd Thursday)</option>
        </select>
      </div>

      {values.recurrenceType === "ONCE" && (
        <div className="field">
          <label>Date</label>
          <input type="date" value={values.recurrenceAnchor} onChange={(e) => set("recurrenceAnchor", e.target.value)} />
        </div>
      )}

      {values.recurrenceType === "DAILY_RANGE" && (
        <div className="grid2">
          <div className="field">
            <label>From</label>
            <input
              type="date"
              value={values.recurrenceAnchor.split("|")[0] ?? ""}
              onChange={(e) => set("recurrenceAnchor", `${e.target.value}|${values.recurrenceAnchor.split("|")[1] ?? ""}`)}
            />
          </div>
          <div className="field">
            <label>Through</label>
            <input
              type="date"
              value={values.recurrenceAnchor.split("|")[1] ?? ""}
              onChange={(e) => set("recurrenceAnchor", `${values.recurrenceAnchor.split("|")[0] ?? ""}|${e.target.value}`)}
            />
          </div>
        </div>
      )}

      {(values.recurrenceType === "WEEKLY" || values.recurrenceType === "BIWEEKLY") && (
        <>
          <div className="field">
            <label>Which day(s)?</label>
            <div className="check-row" style={{ flexWrap: "wrap", gap: 10 }}>
              {WEEKDAY_SHORT.map((label, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={values.recurrenceDays.includes(i)} onChange={() => toggleDay(i)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {values.recurrenceType === "BIWEEKLY" && (
            <div className="field">
              <label>Starting the week of</label>
              <input
                type="date"
                value={values.recurrenceAnchor || todayStr()}
                onChange={(e) => set("recurrenceAnchor", e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {values.recurrenceType === "MONTHLY_NTH" && (
        <>
          <div className="field">
            <label>Which week(s) of the month?</label>
            <div className="check-row" style={{ flexWrap: "wrap", gap: 10 }}>
              {ORDINAL_OPTIONS.map((ord) => (
                <label key={ord} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                  <input type="checkbox" checked={values.recurrenceOrdinals.includes(ord)} onChange={() => toggleOrdinal(ord)} />
                  {ord === -1 ? "Last" : `${ord}${ord === 1 ? "st" : ord === 2 ? "nd" : ord === 3 ? "rd" : "th"}`}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Which day of the week?</label>
            <select
              value={values.recurrenceDays[0] ?? ""}
              onChange={(e) => set("recurrenceDays", e.target.value === "" ? [] : [Number(e.target.value)])}
            >
              <option value="">Select a day</option>
              {WEEKDAY_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
            </select>
          </div>
        </>
      )}

      {values.recurrenceType && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-4px 0 10px" }}>
          Will show on the calendar as: <b>{describeRecurrence(values) || "(pick the options above)"}</b>
        </p>
      )}
      <div className="grid2">
        <div className="field"><label>Start time</label><input type="time" value={values.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
        <div className="field"><label>End time</label><input type="time" value={values.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
      </div>
      <div className="check-row">
        <input type="checkbox" id="f_sdc" checked={values.sameDayCheckIn} onChange={(e) => set("sameDayCheckIn", e.target.checked)} />
        <label htmlFor="f_sdc" style={{ fontSize: 13 }}>Same-day check-in (notifies the cleaner &mdash; they cannot change this)</label>
      </div>
      <div className="field">
        <label>Assign to</label>
        <select value={values.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
          <option value="">Unassigned</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <h3 style={{ marginTop: 16 }}>Job Details</h3>
      <div className="grid2">
        <div className="field"><label>Access code</label><input type="text" value={values.accessCode} onChange={(e) => set("accessCode", e.target.value)} /></div>
        <div className="field"><label>Key location</label><input type="text" value={values.keyLocation} onChange={(e) => set("keyLocation", e.target.value)} /></div>
      </div>
      <div className="field"><label>Where supplies are located</label><input type="text" value={values.suppliesLocation} onChange={(e) => set("suppliesLocation", e.target.value)} /></div>
      <div className="field">
        <label>Note for owner (e.g., supplies to restock or reorder)</label>
        <textarea placeholder="e.g. Running low on paper towels and dish soap" value={values.ownerNote} onChange={(e) => set("ownerNote", e.target.value)} />
      </div>
      <div className="field">
        <label>Damaged or missing items</label>
        <textarea placeholder="e.g. Broken lamp in living room, missing throw pillow" value={values.damageNote} onChange={(e) => set("damageNote", e.target.value)} />
      </div>
      <div className="field"><label>Other notes</label><textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      {error && <div className="auth-error">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Job"}</button>
        <button className="btn secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}
