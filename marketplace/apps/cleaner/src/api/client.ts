import Constants from "expo-constants";

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:3000";

export type Role = "HOMEOWNER" | "CLEANER";

export type Address = {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  notes?: string | null;
};

export type JobStatus = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export type Job = {
  id: string;
  serviceType: "standard" | "deep" | "move-out";
  scheduledFor: string;
  estimatedHours: number;
  priceCents: number;
  notes?: string | null;
  status: JobStatus;
  address: Address;
  homeowner?: { user: { name: string; phone?: string | null } } | null;
  payment?: { status: string } | null;
};

export type Me = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  cleanerProfile?: {
    id: string;
    hourlyRateCents: number;
    stripeOnboarded: boolean;
    ratingAvg?: number | null;
    ratingCount: number;
    baseLat?: number | null;
    baseLng?: number | null;
    serviceRadiusMi: number;
  } | null;
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error ? JSON.stringify(data.error) : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  register: (input: { email: string; password: string; name: string; phone?: string; role: Role }) =>
    request<{ token: string; user: Me }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: Me }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: () => request<Me>("/api/me"),

  registerPushToken: (pushToken: string) =>
    request<{ ok: true }>("/api/me/push-token", { method: "POST", body: JSON.stringify({ pushToken }) }),

  availableJobs: () => request<Job[]>("/api/jobs?scope=available"),

  myJobs: () => request<Job[]>("/api/jobs?scope=mine"),

  job: (id: string) => request<Job>(`/api/jobs/${id}`),

  acceptJob: (id: string) => request<Job>(`/api/jobs/${id}/accept`, { method: "POST" }),

  declineJob: (id: string) => request<{ ok: true }>(`/api/jobs/${id}/decline`, { method: "POST" }),

  startJob: (id: string) => request<Job>(`/api/jobs/${id}/start`, { method: "POST" }),

  completeJob: (id: string) => request<Job>(`/api/jobs/${id}/complete`, { method: "POST" }),

  stripeOnboardingUrl: () => request<{ url: string }>("/api/stripe/connect/onboard", { method: "POST" }),

  stripeStatus: () => request<{ onboarded: boolean }>("/api/stripe/connect/status"),

  updateCleanerProfile: (input: { baseLat?: number; baseLng?: number; serviceRadiusMi?: number }) =>
    request<{ id: string }>("/api/cleaner-profile", { method: "PATCH", body: JSON.stringify(input) }),
};

export { ApiError };
