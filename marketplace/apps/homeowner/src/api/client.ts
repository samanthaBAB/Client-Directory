import Constants from "expo-constants";
import { ServiceTypeId } from "@/catalog";

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
  lat?: number | null;
  lng?: number | null;
};

export type JobStatus = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export type Job = {
  id: string;
  serviceType: ServiceTypeId;
  squareFootage: number;
  bedroomCount: number | null;
  bathroomCount: number | null;
  kitchenCount: number | null;
  extras: string[];
  scheduledFor: string;
  priceCents: number;
  discountLabel?: string | null;
  discountCents: number;
  notes?: string | null;
  status: JobStatus;
  address: Address;
  cleaner?: { user: { name: string; phone?: string | null } } | null;
  payment?: { status: string } | null;
};

export type Me = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  homeownerProfile?: {
    id: string;
    stripeCustomerId?: string | null;
    subscriptionStatus?: string | null;
    hasBookedBefore?: boolean;
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

  createJob: (input: {
    address: Omit<Address, "id">;
    serviceType: ServiceTypeId;
    squareFootage: number;
    bedroomCount?: number;
    bathroomCount?: number;
    kitchenCount?: number;
    extras: string[];
    scheduledFor: string;
    notes?: string;
  }) => request<Job>("/api/jobs", { method: "POST", body: JSON.stringify(input) }),

  myJobs: () => request<Job[]>("/api/jobs"),

  job: (id: string) => request<Job>(`/api/jobs/${id}`),

  cancelJob: (id: string) => request<Job>(`/api/jobs/${id}/cancel`, { method: "POST" }),

  createPaymentIntent: (jobRequestId: string) =>
    request<{ clientSecret: string | null; error?: string }>("/api/payments/create-intent", {
      method: "POST",
      body: JSON.stringify({ jobRequestId }),
    }),

  leaveReview: (input: { jobRequestId: string; rating: number; comment?: string }) =>
    request<{ id: string }>("/api/reviews", { method: "POST", body: JSON.stringify(input) }),

  startSubscription: () =>
    request<{ clientSecret: string; mode: "setup" | "payment" }>("/api/subscription/start", { method: "POST" }),

  cancelSubscription: () =>
    request<{ status: string; cancelAtPeriodEnd: boolean }>("/api/subscription/cancel", { method: "POST" }),
};

export { ApiError };
