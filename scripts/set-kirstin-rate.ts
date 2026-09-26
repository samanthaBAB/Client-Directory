import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const kirstin = await prisma.user.findUnique({ where: { email: "kirstin.nash@icloud.com" } });
  if (!kirstin) throw new Error("Kirstin's account (kirstin.nash@icloud.com) wasn't found.");

  await prisma.user.update({
    where: { id: kirstin.id },
    data: { payoutPercent: 12, payoutFlatFee: 5 },
  });

  console.log("Kirstin's payout rate set to 12% off price, minus $5.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
