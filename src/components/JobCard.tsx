"use client";

import { useRef, useState } from "react";
import { ClientEmployee, ClientJob, ClientPhoto, ClientVisit } from "@/lib/types";
import { formatTimeRange, fmtClock, todayStr } from "@/lib/time";
import { useModal } from "./Modal";

function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w >= h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function compressToLimit(file: File): Promise<string> {
  let dim = 1100, quality = 0.72;
  let dataUrl = await compressImage(file, dim, quality);
  let tries = 0;
  while (dataUrl.length > 220000 && tries < 6) {
    quality = Math.max(0.3, quality - 0.15);
    if (quality <= 0.3) dim = Math.round(dim * 0.75);
    dataUrl = await compressImage(file, dim, quality);
    tries++;
  }
  return dataUrl;
}

interface Props {
  job: ClientJob;
  mode: "owner" | "employee";
  employees: ClientEmployee[];
  photos: ClientPhoto[];
  activeVisit?: ClientVisit;
  recentVisits: string[];
  onAssign?: (employeeId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStartJob?: () => Promise<void>;
  onEndJob?: (note: string) => Promise<void>;
  onLogPastVisit?: (date: string, note: string) => Promise<void>;
  onSaveNote?: (fields: { ownerNote: string; damageNote: string; notes: string }) => Promise<void>;
  onUploadPhotos?: (files: File[]) => Promise<void>;
  onDeletePhoto?: (photoId: string) => Promise<void>;
  onViewPhoto?: (dataUrl: string) => void;
  onRespond?: (decision: "accept" | "decline") => Promise<void>;
}

export default function JobCard({
  job, mode, employees, photos, activeVisit, recentVisits,
  onAssign, onEdit, onDelete,
  onStartJob, onEndJob, onLogPastVisit, onSaveNote,
  onUploadPhotos, onDeletePhoto, onViewPhoto, onRespond,
}: Props) {
  const modal = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(todayStr());
  const [visitNote, setVisitNote] = useState("");
  const [endNote, setEndNote] = useState("");
  const [ownerNoteVal, setOwnerNoteVal] = useState(job.ownerNote ?? "");
  const [damageNoteVal, setDamageNoteVal] = useState(job.damageNote ?? "");
  const [notesVal, setNotesVal] = useState(job.notes ?? "");
  const [busy, setBusy] = useState(false);

  const svcType = job.serviceType;
  const addrLine = [job.address, job.city, job.state].filter(Boolean).join(", ");
  const primaryLabel = job.property || addrLine || "Unnamed Job";
  const timeLine = job.startTime || job.endTime ? formatTimeRange(job.startTime, job.endTime) : "";
  const isPendingOffer = mode === "employee" && job.assignmentStatus === "PENDING";
  // Owner's Clients tab lists every property; collapse each to just the
  // address by default so scanning a long list isn't a wall of supply
  // notes and access codes — tap a client to see the rest.
  const collapsible = mode === "owner";
  const showDetails = !collapsible || expanded;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length || !onUploadPhotos) return;
    setBusy(true);
    try {
      await onUploadPhotos(Array.from(fileList));
    } catch {
      modal.alert("One of the photos could not be uploaded. Try a smaller image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="job-card">
      <div
        className="job-top"
        onClick={collapsible ? () => setExpanded((v) => !v) : undefined}
        style={collapsible ? { cursor: "pointer" } : undefined}
      >
        <div>
          <span className="job-name">{primaryLabel}</span>
          {svcType && <span className="str-pill">{svcType}</span>}
          {job.sameDayCheckIn && <span className="str-pill" style={{ background: "var(--damage-bg)", color: "var(--damage-text)", border: "1px solid var(--damage-border)" }}>&#9889; Same-Day Check-In</span>}
          {job.damageNote && <span className="str-pill" style={{ background: "var(--damage-bg)", color: "var(--damage-text)", border: "1px solid var(--damage-border)" }}>&#9888; Damage</span>}
          {job.ownerNote && <span className="str-pill" style={{ background: "var(--owner-bg)", color: "var(--owner-text)", border: "1px solid var(--owner-border)" }}>Owner note</span>}
          {mode === "owner" && job.assignedTo && job.assignmentStatus === "PENDING" && (
            <span className="str-pill" style={{ background: "var(--str-bg)", color: "var(--str-text)", border: "1px solid var(--str-border)" }}>Awaiting response</span>
          )}
          {isPendingOffer && (
            <span className="str-pill" style={{ background: "var(--str-bg)", color: "var(--str-text)", border: "1px solid var(--str-border)" }}>New Offer</span>
          )}
        </div>
        {collapsible && (
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{expanded ? "▴ Hide" : "▾ Details"}</span>
        )}
      </div>

      {!showDetails ? null : (
      <>
      <div className="job-meta">
        {job.property && addrLine ? <>{addrLine}<br /></> : null}
        {job.schedule}{timeLine ? ` · ${timeLine}` : ""}
      </div>

      {(job.payout || (mode === "owner" && job.price)) && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
          {mode === "owner" && job.price && (
            <div style={{ fontSize: 15, color: "var(--text-secondary)" }}>
              Price: <span style={{ fontWeight: 700, color: "var(--text)" }}>{job.price}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}> (client &mdash; not shown to cleaner)</span>
            </div>
          )}
          {job.payout && (
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-strong)" }}>
              Payout: {job.payout}
            </div>
          )}
        </div>
      )}

      {(job.accessCode || job.keyLocation || job.suppliesLocation) && (
        <div className="str-box">
          {job.accessCode && <div><b>Access code:</b> {job.accessCode}</div>}
          {job.keyLocation && <div><b>Key:</b> {job.keyLocation}</div>}
          {job.suppliesLocation && <div><b>Supplies:</b> {job.suppliesLocation}</div>}
        </div>
      )}
      {job.ownerNote && <div className="owner-box"><span className="lbl">Note for owner</span>{job.ownerNote}</div>}
      {job.damageNote && <div className="damage-box"><span className="lbl">Damaged / missing items</span>{job.damageNote}</div>}
      {job.notes && <div className="notes">{job.notes}</div>}

      {!isPendingOffer && (
        <div className="photos-section">
          <div className="photos-label">Job Photos</div>
          <div className="photo-strip">
            {photos.map((p) => (
              <div className="photo-thumb-wrap" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="photo-thumb" src={p.dataUrl} alt="Job" onClick={() => onViewPhoto?.(p.dataUrl)} />
                <button className="photo-del" title="Delete photo" onClick={async () => {
                  if (await modal.confirm("Delete this photo?")) onDeletePhoto?.(p.id);
                }}>&times;</button>
              </div>
            ))}
            <button className="photo-add-btn" title="Add photos" disabled={busy} onClick={() => fileInputRef.current?.click()}>+</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={async (e) => {
                await handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {isPendingOffer ? (
        <div className="job-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <p style={{ margin: "0 0 4px", fontSize: 14.5, color: "var(--text-secondary)" }}>
            You&apos;ve been offered this job. Take a look at the details above, then accept or decline &mdash; no pressure either way.
          </p>
          <div className="job-actions">
            <button className="btn block" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await onRespond?.("accept"); } finally { setBusy(false); }
            }}>Accept Job</button>
            <button className="btn secondary block" disabled={busy} onClick={async () => {
              if (!(await modal.confirm("Decline this job offer? It will go back to unassigned."))) return;
              setBusy(true);
              try { await onRespond?.("decline"); } finally { setBusy(false); }
            }}>Decline</button>
          </div>
        </div>
      ) : mode === "owner" ? (
        <div className="job-actions">
          <select value={job.assignedTo ?? ""} onChange={(e) => onAssign?.(e.target.value)}>
            <option value="">Unassigned</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button className="btn secondary small" onClick={onEdit}>Edit</button>
          <button className="btn danger small" onClick={async () => {
            if (await modal.confirm("Delete this job? Its photos will be deleted too.")) onDelete?.();
          }}>Delete</button>
        </div>
      ) : (
        <>
          <div className="job-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
            {activeVisit ? (
              <>
                <button className="btn block" style={{ background: "var(--danger)" }} onClick={() => setEndOpen((v) => !v)}>
                  {endOpen ? "Cancel" : "■ End Job"}
                </button>
                <div className="visit-log-summary">Started at {fmtClock(activeVisit.startedAt!)}</div>
                {endOpen && (
                  <div className="visit-form">
                    <div className="field">
                      <label>Note (optional)</label>
                      <textarea placeholder="Anything worth noting about this clean" value={endNote} onChange={(e) => setEndNote(e.target.value)} />
                    </div>
                    <button className="btn small" disabled={busy} onClick={async () => {
                      setBusy(true);
                      try { await onEndJob?.(endNote); setEndOpen(false); setEndNote(""); } finally { setBusy(false); }
                    }}>Confirm &mdash; Job Finished</button>
                  </div>
                )}
              </>
            ) : (
              <button className="btn block" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await onStartJob?.(); } finally { setBusy(false); }
              }}>&#9654; Start Job</button>
            )}
          </div>

          {recentVisits.length > 0 && (
            <div className="visit-log-summary">Last logged: {recentVisits.join(", ")}</div>
          )}

          <div className="job-actions">
            <button className="btn secondary small" onClick={() => setVisitOpen((v) => !v)}>{visitOpen ? "Cancel" : "Log a past visit"}</button>
            <button className="btn secondary small" onClick={() => setEditOpen((v) => !v)}>{editOpen ? "Cancel" : "Add a note"}</button>
          </div>

          {visitOpen && (
            <div className="visit-form">
              <div className="grid2">
                <div className="field"><label>Date</label><input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} /></div>
              </div>
              <div className="field"><label>Note (optional)</label><textarea placeholder="Anything worth noting about that clean" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} /></div>
              <button className="btn small" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await onLogPastVisit?.(visitDate, visitNote); setVisitOpen(false); setVisitNote(""); } finally { setBusy(false); }
              }}>Save Visit</button>
            </div>
          )}

          {editOpen && (
            <div className="visit-form">
              <div className="field"><label>Note for owner (supplies to restock or reorder)</label><textarea value={ownerNoteVal} onChange={(e) => setOwnerNoteVal(e.target.value)} /></div>
              <div className="field"><label>Damaged or missing items</label><textarea value={damageNoteVal} onChange={(e) => setDamageNoteVal(e.target.value)} /></div>
              <div className="field"><label>Other notes</label><textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)} /></div>
              <button className="btn small" disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                  await onSaveNote?.({ ownerNote: ownerNoteVal, damageNote: damageNoteVal, notes: notesVal });
                  setEditOpen(false);
                } finally { setBusy(false); }
              }}>Save</button>
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}

export { compressToLimit };
