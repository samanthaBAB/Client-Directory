import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Samantha hasn't decided who cleans which of Lynne Bermel's properties
// yet, so nothing should be marked assigned. This clears assignment on
// all 6, even though only 121 Mayberry Grove (assigned to Kirstin) was
// actually set.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const result = await prisma.job.updateMany({
    where: { organizationId: owner.organizationId, customer: "Lynne Bermel" },
    data: { assignedToId: null, assignmentStatus: "NONE" },
  });

  console.log(`Unassigned ${result.count} of Lynne Bermel's properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
