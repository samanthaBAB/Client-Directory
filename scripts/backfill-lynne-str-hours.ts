import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const result = await prisma.job.updateMany({
    where: {
      organizationId: owner.organizationId,
      customer: "Lynne Bermel",
      serviceType: STR_TYPE,
    },
    data: {
      startTime: "11:00",
      endTime: "15:00",
    },
  });

  console.log(`Set checkout 11am / check-in 3pm on ${result.count} of Lynne Bermel's short-term rental job(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
