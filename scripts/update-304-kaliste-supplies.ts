import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const result = await prisma.job.updateMany({
    where: {
      organizationId: owner.organizationId,
      customer: "Lynne Bermel",
      address: "1510 Kaliste Saloom Road, Unit 304",
    },
    data: {
      suppliesLocation:
        "The key to the supply closet is located behind the router in the pantry of the kitchen. The supply closet is the door with the keypad, to the right before you enter the kitchen.",
    },
  });

  console.log(`Updated ${result.count} record(s) for 1510 Kaliste Saloom Road, Unit 304.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
