import { PrismaClient } from "@prisma/client";
import { calculatePayout } from "../src/lib/payout";

const prisma = new PrismaClient();

const KIRSTIN_EMAIL = "kirstin.nash@icloud.com";

// Run add-tanya-oak-branch.ts first — this updates that job, it doesn't create it.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const kirstin = await prisma.user.findUnique({ where: { email: KIRSTIN_EMAIL } });
  if (!kirstin) throw new Error(`Kirstin account (${KIRSTIN_EMAIL}) not found.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: "Tanya", address: "103 Oak Branch Street" },
  });
  if (!job) throw new Error("Tanya's 103 Oak Branch Street job wasn't found — run add-tanya-oak-branch.ts first.");

  const payout = calculatePayout(job.price, kirstin.payoutPercent, kirstin.payoutFlatFee);

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      assignedToId: kirstin.id,
      assignmentStatus: "PENDING",
      payout,
      schedule: "Sept 28 – Oct 16, 2026 (flexible — no fixed days, work in as schedule allows)",
      ownerNote: "Samantha (owner) is working this job alongside Kirstin.",
    },
  });

  console.log(`Assigned ${updated.customer} — ${updated.address} to ${kirstin.name}, offered.`);
  console.log(`Price ${updated.price}, payout: ${updated.payout}.`);
  console.log(`Window: ${updated.schedule}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
