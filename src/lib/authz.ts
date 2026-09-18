import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export function isOwnerLevel(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export function isSuperAdmin(role: string) {
  return role === "SUPER_ADMIN";
}
