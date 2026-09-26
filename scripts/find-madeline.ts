import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const jobs = await prisma.job.findMany({
    where: {
      organizationId: owner.organizationId,
      OR: [
        { customer: { contains: "Madel", mode: "insensitive" } },
        { customer: { contains: "Fonten", mode: "insensitive" } },
        { address: { contains: "Dusty Ridge", mode: "insensitive" } },
      ],
    },
  });

  if (!jobs.length) {
    console.log("No matching job found. She may not be in the app yet under any similar name/address.");
    return;
  }

  console.log(`Found ${jobs.length} possible match(es):\n`);
  for (const j of jobs) {
    console.log(`- customer: "${j.customer}"`);
    console.log(`    address: ${j.address}`);
    console.log(`    id: ${j.id}`);
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
