import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOTES_STANDARD = [
  "No laundry is to be taken off site. Notify Samantha or Kirstin if there's a problem completing laundry on site.",
  "Six of everything — six glasses, six forks, six spoons, six plates, six dishwasher pods, six laundry pods, six dryer sheets.",
  "One roll of paper towels on the paper towel holder, and one roll under the sink.",
  "Six trash bags under the sink.",
  "One kitchen sponge under the sink, and one on the kitchen sink.",
  "Two rolls of toilet paper in each bathroom — one on the holder, one under the counter.",
  "Four bath towels, two washcloths, and one hand towel in the cabinet of each bathroom, plus one hand towel on the bathroom counter/sink.",
].map((n) => `- ${n}`).join("\n");

const NOTES_STEINER =
  NOTES_STANDARD +
  "\n- The thin blanket is the main blanket to be put on/made on the bed; the thick comforter is to be folded at the foot of the bed.";

const SUPPLIES_MAYBERRY = "To the right of the washer, behind the wall of shelves, in the cubby you have to duck down to get to.";
const SUPPLIES_STEINER =
  "Key for the cleaning supply cabinet is in the cabinet above the refrigerator, left side. Cleaning supply cabinet is the bottom cabinet to the left of the refrigerator. Extra supplies are in the pantry/washer-dryer area, in a tote.";

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);
  const organizationId = owner.organizationId;

  const properties = [
    {
      address: "121 Mayberry Grove",
      accessCode: "1015",
      suppliesLocation: SUPPLIES_MAYBERRY,
      notes: NOTES_STANDARD,
    },
    {
      address: "204 Steiner Oaks",
      accessCode: "000466",
      suppliesLocation: SUPPLIES_STEINER,
      notes: NOTES_STEINER,
    },
  ];

  for (const p of properties) {
    const job = await prisma.job.create({
      data: {
        organizationId,
        customer: "Lynne Bermel",
        address: p.address,
        serviceType: STR_TYPE,
        price: "$120",
        accessCode: p.accessCode,
        suppliesLocation: p.suppliesLocation,
        notes: p.notes,
      },
    });
    console.log(`Recreated: ${job.address}`);
  }

  console.log("\nDone — both properties recreated, unassigned, no schedule.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
