import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeJob, serializeUser } from "@/lib/serialize";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.organizationId) return null; // middleware handles the redirect (or routes super admins to /admin)

  const organizationId = session.user.organizationId;
  const owner = isOwnerLevel(session.user.role);

  const jobsWhere = owner ? { organizationId } : { organizationId, assignedToId: session.user.id };
  const jobs = await prisma.job.findMany({ where: jobsWhere, orderBy: { createdAt: "asc" } });

  let employees: Array<ReturnType<typeof serializeUser> & { jobCount: number }> = [];
  let org: { name: string; propertyLimit: number } | null = null;
  if (owner) {
    const [rows, orgRow] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId, role: { in: ["EMPLOYEE", "ADMIN"] } },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { assignedJobs: true } } },
      }),
      prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);
    employees = rows.map((e) => ({ ...serializeUser(e), jobCount: e._count.assignedJobs }));
    org = orgRow ? { name: orgRow.name, propertyLimit: orgRow.propertyLimit } : null;
  }

  return (
    <Dashboard
      user={{
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        phone: null,
        role: session.user.role,
        mustChangePw: session.user.mustChangePw,
      }}
      organization={org}
      initialJobs={jobs.map(serializeJob)}
      initialEmployees={employees}
    />
  );
}
