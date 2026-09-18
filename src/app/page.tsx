import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeJob, serializeUser } from "@/lib/serialize";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) return null; // middleware handles the redirect

  const owner = isOwnerLevel(session.user.role);

  const jobsWhere = owner ? {} : { assignedToId: session.user.id };
  const jobs = await prisma.job.findMany({ where: jobsWhere, orderBy: { createdAt: "asc" } });

  let employees: Array<ReturnType<typeof serializeUser> & { jobCount: number }> = [];
  if (owner) {
    const rows = await prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { assignedJobs: true } } },
    });
    employees = rows.map((e) => ({ ...serializeUser(e), jobCount: e._count.assignedJobs }));
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
      initialJobs={jobs.map(serializeJob)}
      initialEmployees={employees}
    />
  );
}
