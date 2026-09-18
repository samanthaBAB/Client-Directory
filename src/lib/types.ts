export type Role = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "EMPLOYEE";

export type OrgStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";

export type AssignmentStatus = "NONE" | "PENDING" | "ACCEPTED";

export interface ClientOrganization {
  id: string;
  name: string;
  propertyLimit: number;
  monthlyPriceCents: number;
  status: OrgStatus;
  notes: string | null;
  createdAt: number;
  userCount?: number;
  jobCount?: number;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  mustChangePw: boolean;
}

export interface ClientEmployee extends ClientUser {
  jobCount: number;
  tempPassword?: string;
}

export interface ClientJob {
  id: string;
  customer: string;
  property: string | null;
  serviceType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  price: string | null;
  phone: string | null;
  schedule: string | null;
  startTime: string | null;
  endTime: string | null;
  sameDayCheckIn: boolean;
  accessCode: string | null;
  keyLocation: string | null;
  suppliesLocation: string | null;
  ownerNote: string | null;
  damageNote: string | null;
  notes: string | null;
  assignedTo: string | null;
  assignmentStatus: AssignmentStatus;
}

export interface ClientPhoto {
  id: string;
  jobId: string;
  dataUrl: string;
  uploadedAt: number;
}

export type VisitStatus = "IN_PROGRESS" | "COMPLETED";

export interface ClientVisit {
  id: string;
  jobId: string | null;
  jobLabel: string;
  employeeId: string;
  date: string;
  status: VisitStatus;
  startedAt: number | null;
  endedAt: number | null;
  note: string | null;
  sameDayCheckIn: boolean;
  createdAt: number;
}

export const SERVICE_TYPES = [
  "Residential Cleaning",
  "Deep Cleaning",
  "Move-In Cleaning",
  "Move-Out Cleaning",
  "Short-Term / Vacation Rental Cleaning",
  "Commercial Cleaning",
] as const;

export const STR_TYPE = "Short-Term / Vacation Rental Cleaning";

export function isOwnerLevelRole(role: Role) {
  return role === "OWNER" || role === "ADMIN";
}
