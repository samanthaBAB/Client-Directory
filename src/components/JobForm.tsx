"use client";

import { useState } from "react";
import { ClientEmployee, ClientJob, SERVICE_TYPES } from "@/lib/types";

export interface JobFormValues {
  customer: string;
  property: string;
  serviceType: string;
  address: string;
  city: string;
  state: string;
  price: string;
  phone: string;
  schedule: string;
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
    phone: job?.phone ?? "",
    schedule: job?.schedule ?? "",
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

  async function handleSave() {
    if (!values.customer.trim()) {
      setError("Please enter a customer name.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h3>{job ? "Edit Job" : "Add Job"}</h3>
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
        <div className="field"><label>Price</label><input type="text" placeholder="e.g. $100/clean" value={values.price} onChange={(e) => set("price", e.target.value)} /></div>
        <div className="field"><label>Phone</label><input type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Days / recurrence (optional)</label>
        <input type="text" placeholder="e.g. 1st & 3rd Thursday, or Mon/Wed/Fri" value={values.schedule} onChange={(e) => set("schedule", e.target.value)} />
      </div>
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
