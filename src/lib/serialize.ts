import type { Job, Photo, User, Visit } from "@prisma/client";

export function serializeUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    mustChangePw: u.mustChangePw,
  };
}

export function serializeJob(j: Job & { assignedTo?: User | null }) {
  return {
    id: j.id,
    customer: j.customer,
    property: j.property,
    serviceType: j.serviceType,
    address: j.address,
    city: j.city,
    state: j.state,
    price: j.price,
    phone: j.phone,
    schedule: j.schedule,
    startTime: j.startTime,
    endTime: j.endTime,
    sameDayCheckIn: j.sameDayCheckIn,
    accessCode: j.accessCode,
    keyLocation: j.keyLocation,
    suppliesLocation: j.suppliesLocation,
    ownerNote: j.ownerNote,
    damageNote: j.damageNote,
    notes: j.notes,
    assignedTo: j.assignedToId,
  };
}

export function serializePhoto(p: Photo) {
  return { id: p.id, jobId: p.jobId, dataUrl: p.dataUrl, uploadedAt: p.uploadedAt.getTime() };
}

export function serializeVisit(v: Visit) {
  return {
    id: v.id,
    jobId: v.jobId,
    jobLabel: v.jobLabel,
    employeeId: v.employeeId,
    date: v.date,
    status: v.status,
    startedAt: v.startedAt ? v.startedAt.getTime() : null,
    endedAt: v.endedAt ? v.endedAt.getTime() : null,
    note: v.note,
    sameDayCheckIn: v.sameDayCheckIn,
    createdAt: v.createdAt.getTime(),
  };
}
