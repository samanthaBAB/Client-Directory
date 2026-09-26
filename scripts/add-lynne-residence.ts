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
      customer: "Lynne Bermel",
      property: "Residence (address pending)",
      serviceType: "Residential Cleaning",
      price: "$200",
    },
  });

  console.log(`Created: ${job.property} (id: ${job.id})`);
  console.log("Unassigned, no schedule, no address yet — fill the address in once you have it.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
