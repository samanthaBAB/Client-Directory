import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  console.log(`Owner ${owner.email} — organizationId: ${owner.organizationId}\n`);

  // Search with no org scoping at all, in case of a mismatch.
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { customer: { contains: "Tanya", mode: "insensitive" } },
        { address: { contains: "Oak Branch", mode: "insensitive" } },
      ],
    },
  });

  if (!jobs.length) {
    console.log("No job found anywhere matching 'Tanya' or 'Oak Branch' — it does not exist in the database.");
    return;
  }

  console.log(`Found ${jobs.length} matching job(s):\n`);
  for (const j of jobs) {
    console.log(JSON.stringify(j, null, 2));
    console.log(`organizationId matches owner: ${j.organizationId === owner.organizationId}\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
