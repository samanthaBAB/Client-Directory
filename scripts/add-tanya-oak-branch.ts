import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const job = await prisma.job.create({
    data: {
      organizationId: owner.organizationId,
      customer: "Tanya",
      address: "103 Oak Branch Street",
      serviceType: "Deep Clean & Whole-House Organizing",
    },
  });

  console.log(`Created: ${job.customer} — ${job.address} (id: ${job.id})`);
  console.log("Unassigned, no schedule.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
