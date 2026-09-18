import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";
import { serializeOrganization } from "@/lib/serialize";
import AdminConsole from "@/components/AdminConsole";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) redirect("/");

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, jobs: true } } },
  });

  return <AdminConsole initialOrgs={orgs.map(serializeOrganization)} />;
}
