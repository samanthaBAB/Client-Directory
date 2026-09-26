import type { Job, Organization, Photo, User, Visit } from "@prisma/client";

export function serializeUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    mustChangePw: u.mustChangePw,
    payoutPercent: u.payoutPercent,
    payoutFlatFee: u.payoutFlatFee,
  };
}

// `includePrice` controls whether the customer's price is in the payload
// at all — not just whether the UI renders it. Cleaners must never see
// what the client is charged, only their own payout, so every route that
// serves a cleaner (not an owner/admin) passes includePrice: false. This
// has to happen server-side: hiding it only in the UI would still leak it
// through the raw API response (e.g. browser dev tools).
export function serializeJob(j: Job & { assignedTo?: User | null }, opts: { includePrice: boolean } = { includePrice: true }) {
  return {
    id: j.id,
    customer: j.customer,
    property: j.property,
    serviceType: j.serviceType,
    address: j.address,
    city: j.city,
    state: j.state,
    price: opts.includePrice ? j.price : null,
    payout: j.payout,
    phone: j.phone,
    schedule: j.schedule,
    recurrenceType: j.recurrenceType,
    recurrenceDays: j.recurrenceDays,
    recurrenceOrdinals: j.recurrenceOrdinals,
    recurrenceAnchor: j.recurrenceAnchor,
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
    assignmentStatus: j.assignmentStatus,
  };
}

export function serializeOrganization(o: Organization & { _count?: { users: number; jobs: number } }) {
  return {
    id: o.id,
    name: o.name,
    propertyLimit: o.propertyLimit,
    monthlyPriceCents: o.monthlyPriceCents,
    status: o.status,
    notes: o.notes,
    createdAt: o.createdAt.getTime(),
    userCount: o._count?.users ?? undefined,
    jobCount: o._count?.jobs ?? undefined,
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
