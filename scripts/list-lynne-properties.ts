import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const jobs = await prisma.job.findMany({
    where: { organizationId: owner.organizationId, customer: "Lynne Bermel" },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${jobs.length} job(s) for Lynne Bermel:\n`);
  for (const j of jobs) {
    console.log(`- ${j.address}`);
    console.log(`    id: ${j.id}`);
    console.log(`    serviceType: ${j.serviceType}`);
    console.log(`    assignedToId: ${j.assignedToId}, assignmentStatus: ${j.assignmentStatus}`);
    console.log(`    sameDayCheckIn: ${j.sameDayCheckIn}, recurrenceType: ${j.recurrenceType}, recurrenceAnchor: ${j.recurrenceAnchor}`);
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
