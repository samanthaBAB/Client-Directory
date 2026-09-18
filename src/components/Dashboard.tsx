"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  ClientEmployee,
  ClientJob,
  ClientPhoto,
  ClientUser,
  ClientVisit,
  SERVICE_TYPES,
  isOwnerLevelRole,
} from "@/lib/types";
import { sortJobsChronologically } from "@/lib/sortJobs";
import { fmtDuration } from "@/lib/time";
import JobForm, { JobFormValues } from "./JobForm";
import JobCard, { compressToLimit } from "./JobCard";
import EmployeesPanel from "./EmployeesPanel";
import Calendar from "./Calendar";
import { Lightbox, ModalProvider } from "./Modal";

type Tab = "jobs" | "employees" | "myjobs" | "mycal";

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

interface OrgSummary {
  name: string;
  propertyLimit: number;
}

export default function Dashboard(props: {
  user: ClientUser;
  organization: OrgSummary | null;
  initialJobs: ClientJob[];
  initialEmployees: ClientEmployee[];
}) {
  return (
    <ModalProvider>
      <DashboardInner {...props} />
    </ModalProvider>
  );
}

function DashboardInner({
  user,
  organization,
  initialJobs,
  initialEmployees,
}: {
  user: ClientUser;
  organization: OrgSummary | null;
  initialJobs: ClientJob[];
  initialEmployees: ClientEmployee[];
}) {
  const owner = isOwnerLevelRole(user.role);

  const [tab, setTab] = useState<Tab>(owner ? "jobs" : "myjobs");
  const [jobs, setJobs] = useState<ClientJob[]>(initialJobs);
  const [employees, setEmployees] = useState<ClientEmployee[]>(initialEmployees);
  const [visits, setVisits] = useState<ClientVisit[]>([]);
  const [photosByJob, setPhotosByJob] = useState<Record<string, ClientPhoto[]>>({});
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<ClientJob | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterServiceType, setFilterServiceType] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const refreshJobs = useCallback(async () => {
    const data = await api("/api/jobs");
    setJobs(data);
  }, []);

  const refreshEmployees = useCallback(async () => {
    if (!owner) return;
    const data = await api("/api/employees");
    setEmployees(data);
  }, [owner]);

  const refreshVisits = useCallback(async () => {
    if (owner) return;
    const data = await api("/api/visits");
    setVisits(data);
  }, [owner]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void refreshVisits();
  }, [refreshVisits]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshJobs();
      refreshEmployees();
      refreshVisits();
    }, 25000);
    return () => clearInterval(id);
  }, [refreshJobs, refreshEmployees, refreshVisits]);

  const jobIdsKey = jobs.map((j) => j.id).join(",");
  useEffect(() => {
    jobs.forEach((j) => {
      if (photosByJob[j.id]) return;
      api(`/api/jobs/${j.id}/photos`).then((data) => {
        setPhotosByJob((p) => (p[j.id] ? p : { ...p, [j.id]: data }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdsKey]);

  async function handleSaveJob(values: JobFormValues) {
    const payload = { ...values, assignedTo: values.assignedTo || null };
    if (editingJob) {
      const updated = await api(`/api/jobs/${editingJob.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setJobs((js) => js.map((j) => (j.id === updated.id ? updated : j)));
    } else {
      const created = await api("/api/jobs", { method: "POST", body: JSON.stringify(payload) });
      setJobs((js) => [...js, created]);
    }
    setShowJobForm(false);
    setEditingJob(null);
  }

  async function handleAssign(jobId: string, employeeId: string) {
    const updated = await api(`/api/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedTo: employeeId || null }),
    });
    setJobs((js) => js.map((j) => (j.id === jobId ? updated : j)));
  }

  async function handleDeleteJob(jobId: string) {
    await api(`/api/jobs/${jobId}`, { method: "DELETE" });
    setJobs((js) => js.filter((j) => j.id !== jobId));
  }

  async function handleAddEmployee(name: string, email: string, phone: string) {
    const created = await api("/api/employees", {
      method: "POST",
      body: JSON.stringify({ name, email, phone }),
    });
    setEmployees((es) => [...es, created]);
    return created.tempPassword as string;
  }

  async function handleToggleAdmin(id: string, makeAdmin: boolean) {
    const updated = await api(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isAdmin: makeAdmin }),
    });
    setEmployees((es) => es.map((e) => (e.id === id ? { ...e, role: updated.role } : e)));
  }

  async function handleResetPassword(id: string) {
    const res = await api(`/api/employees/${id}/reset-password`, { method: "POST" });
    return res.tempPassword as string;
  }

  async function handleRemoveEmployee(id: string) {
    await api(`/api/employees/${id}`, { method: "DELETE" });
    setEmployees((es) => es.filter((e) => e.id !== id));
    setJobs((js) => js.map((j) => (j.assignedTo === id ? { ...j, assignedTo: null } : j)));
  }

  async function fetchVisitsForEmployee(id: string) {
    return api(`/api/visits?employeeId=${id}`);
  }

  async function handleStartJob(job: ClientJob) {
    const visit = await api("/api/visits", {
      method: "POST",
      body: JSON.stringify({ jobId: job.id, status: "in_progress" }),
    });
    setVisits((vs) => [visit, ...vs]);
  }

  async function handleEndJob(visit: ClientVisit, note: string) {
    const updated = await api(`/api/visits/${visit.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", note }),
    });
    setVisits((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
  }

  async function handleLogPastVisit(job: ClientJob, date: string, note: string) {
    const visit = await api("/api/visits", {
      method: "POST",
      body: JSON.stringify({ jobId: job.id, status: "completed", date, note }),
    });
    setVisits((vs) => [visit, ...vs]);
  }

  async function handleRespondToOffer(job: ClientJob, decision: "accept" | "decline") {
    const updated = await api(`/api/jobs/${job.id}/respond`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    setJobs((js) => js.map((j) => (j.id === job.id ? updated : j)));
  }

  async function handleSaveNote(job: ClientJob, fields: { ownerNote: string; damageNote: string; notes: string }) {
    const updated = await api(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(fields) });
    setJobs((js) => js.map((j) => (j.id === job.id ? updated : j)));
  }

  async function handleUploadPhotos(jobId: string, files: File[]) {
    for (const file of files) {
      const dataUrl = await compressToLimit(file);
      const photo = await api(`/api/jobs/${jobId}/photos`, { method: "POST", body: JSON.stringify({ dataUrl }) });
      setPhotosByJob((p) => ({ ...p, [jobId]: [...(p[jobId] || []), photo] }));
    }
  }

  async function handleDeletePhoto(jobId: string, photoId: string) {
    await api(`/api/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" });
    setPhotosByJob((p) => ({ ...p, [jobId]: (p[jobId] || []).filter((ph) => ph.id !== photoId) }));
  }

  function activeVisitForJob(jobId: string) {
    return visits.find((v) => v.jobId === jobId && v.status === "IN_PROGRESS");
  }

  function recentVisitsForJob(jobId: string) {
    return visits
      .filter((v) => v.jobId === jobId && v.status !== "IN_PROGRESS")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
      .map((v) => (v.startedAt && v.endedAt ? `${v.date} (${fmtDuration(v.endedAt - v.startedAt)})` : v.date));
  }

  let ownerJobs = jobs;
  if (filterEmployee === "__unassigned") ownerJobs = ownerJobs.filter((j) => !j.assignedTo);
  else if (filterEmployee) ownerJobs = ownerJobs.filter((j) => j.assignedTo === filterEmployee);
  if (filterServiceType) ownerJobs = ownerJobs.filter((j) => j.serviceType === filterServiceType);
  ownerJobs = sortJobsChronologically(ownerJobs);

  const myAssignedJobs = jobs.filter((j) => j.assignedTo === user.id);
  const myOffers = sortJobsChronologically(myAssignedJobs.filter((j) => j.assignmentStatus === "PENDING"));
  const myJobs = sortJobsChronologically(myAssignedJobs.filter((j) => j.assignmentStatus === "ACCEPTED"));

  return (
    <div className="wrap">
      <div className="header-row">
        <div>
          {organization && (
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-strong)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".04em" }}>
              {organization.name}
            </p>
          )}
          <h1>BAB Tasker</h1>
          <p className="sub">Job assignments, access details, and visit history.</p>
        </div>
        <div className="viewer-badge">
          <div>
            Viewing as <b>{owner && user.role === "OWNER" ? "Owner" : user.name}</b>
            {user.role === "ADMIN" && " (Administrator)"}
          </div>
          <Link className="link-btn" href="/account">Account settings</Link>
          {" · "}
          <Link className="link-btn" href="/change-password">Change password</Link>
          {" · "}
          <button className="link-btn" onClick={() => signOut({ redirectTo: "/login" })}>Sign out</button>
        </div>
      </div>

      {owner ? (
        <>
          <div className="tabs">
            <button className={`tab-btn ${tab === "jobs" ? "active" : ""}`} onClick={() => setTab("jobs")}>Jobs</button>
            <button className={`tab-btn ${tab === "employees" ? "active" : ""}`} onClick={() => setTab("employees")}>Employees</button>
          </div>

          {tab === "jobs" && (
            <div>
              {organization && (
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "-6px 0 12px" }}>
                  {jobs.length} / {organization.propertyLimit} properties on your plan
                </p>
              )}
              <div className="toolbar">
                <button
                  className="btn"
                  disabled={!!organization && jobs.length >= organization.propertyLimit}
                  title={organization && jobs.length >= organization.propertyLimit ? "You've reached your plan's property limit — contact us to upgrade." : undefined}
                  onClick={() => { setEditingJob(null); setShowJobForm(true); }}
                >
                  + Add Job
                </button>
                <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                  <option value="">All employees</option>
                  <option value="__unassigned">Unassigned</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={filterServiceType} onChange={(e) => setFilterServiceType(e.target.value)}>
                  <option value="">All service types</option>
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {showJobForm && (
                <JobForm
                  job={editingJob}
                  employees={employees}
                  onSave={handleSaveJob}
                  onCancel={() => { setShowJobForm(false); setEditingJob(null); }}
                />
              )}

              {ownerJobs.length === 0 ? (
                <div className="empty">No jobs yet. Add one above.</div>
              ) : (
                ownerJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    mode="owner"
                    employees={employees}
                    photos={photosByJob[job.id] || []}
                    recentVisits={[]}
                    onAssign={(empId) => handleAssign(job.id, empId)}
                    onEdit={() => { setEditingJob(job); setShowJobForm(true); }}
                    onDelete={() => handleDeleteJob(job.id)}
                    onUploadPhotos={(files) => handleUploadPhotos(job.id, files)}
                    onDeletePhoto={(photoId) => handleDeletePhoto(job.id, photoId)}
                    onViewPhoto={setLightboxSrc}
                  />
                ))
              )}
            </div>
          )}

          {tab === "employees" && (
            <EmployeesPanel
              employees={employees}
              currentRole={user.role}
              onAddEmployee={handleAddEmployee}
              onToggleAdmin={handleToggleAdmin}
              onResetPassword={handleResetPassword}
              onRemoveEmployee={handleRemoveEmployee}
              fetchVisitsForEmployee={fetchVisitsForEmployee}
            />
          )}
        </>
      ) : (
        <>
          <div className="tabs">
            <button className={`tab-btn ${tab === "myjobs" ? "active" : ""}`} onClick={() => setTab("myjobs")}>My Jobs</button>
            <button className={`tab-btn ${tab === "mycal" ? "active" : ""}`} onClick={() => setTab("mycal")}>My Calendar</button>
          </div>

          {tab === "myjobs" && (
            <>
              {myOffers.length > 0 && (
                <>
                  <div className="group-title">Job Offers</div>
                  {myOffers.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      mode="employee"
                      employees={employees}
                      photos={photosByJob[job.id] || []}
                      recentVisits={[]}
                      onViewPhoto={setLightboxSrc}
                      onRespond={(decision) => handleRespondToOffer(job, decision)}
                    />
                  ))}
                  <div className="group-title">My Jobs</div>
                </>
              )}
              {myJobs.length === 0 ? (
                <div className="empty">No jobs assigned to you yet &mdash; check with the owner.</div>
              ) : (
                myJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    mode="employee"
                    employees={employees}
                    photos={photosByJob[job.id] || []}
                    activeVisit={activeVisitForJob(job.id)}
                    recentVisits={recentVisitsForJob(job.id)}
                    onStartJob={() => handleStartJob(job)}
                    onEndJob={(note) => {
                      const active = activeVisitForJob(job.id);
                      return active ? handleEndJob(active, note) : Promise.resolve();
                    }}
                    onLogPastVisit={(date, note) => handleLogPastVisit(job, date, note)}
                    onSaveNote={(fields) => handleSaveNote(job, fields)}
                    onUploadPhotos={(files) => handleUploadPhotos(job.id, files)}
                    onDeletePhoto={(photoId) => handleDeletePhoto(job.id, photoId)}
                    onViewPhoto={setLightboxSrc}
                    onRespond={(decision) => handleRespondToOffer(job, decision)}
                  />
                ))
              )}
            </>
          )}

          {tab === "mycal" && <Calendar visits={visits} />}
        </>
      )}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
