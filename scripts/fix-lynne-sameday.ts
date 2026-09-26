import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The original import script wrongly turned on "same-day check-in" for
// every Lynne Bermel property, when it should only apply to bookings with
// an actual confirmed back-to-back turnover. Only 121 Mayberry Grove and
// 204 Steiner Oaks had a real same-day date; the rest were unscheduled and
// shouldn't have had the flag on.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const addressesToFix = [
    "117 Mayberry Grove",
    "206 Steiner Oaks",
    "1510 Kaliste Saloom Road, Unit 301",
    "1510 Kaliste Saloom Road, Unit 304",
  ];

  for (const address of addressesToFix) {
    const result = await prisma.job.updateMany({
      where: { organizationId: owner.organizationId, customer: "Lynne Bermel", address },
      data: { sameDayCheckIn: false },
    });
    console.log(`${address}: updated ${result.count} record(s)`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
