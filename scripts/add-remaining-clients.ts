import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);
  const organizationId = owner.organizationId;

  const clients = [
    { customer: "Theresa LeBlanc", address: "804 Barrow Street", serviceType: "Short-Term / Vacation Rental Cleaning", price: "$100", accessCode: "1987" },
    { customer: "Meagan Perkins", address: "201 Bon Vie Drive", serviceType: "Residential Cleaning", price: "$125" },
    { customer: "Becky Sanders", address: "103 1/2 Vital Street", serviceType: "Residential Cleaning", price: "$20/hr" },
    { customer: "Chung Thang", address: "536 Settlers Trace Blvd, Apt 1032", serviceType: "Residential Cleaning", price: "$120" },
    { customer: "Faye Veverka", address: "3277 Bella Road", serviceType: "Residential Cleaning", price: "$125" },
  ];

  for (const c of clients) {
    const job = await prisma.job.create({
      data: {
        organizationId,
        customer: c.customer,
        address: c.address,
        serviceType: c.serviceType,
        price: c.price,
        accessCode: c.accessCode || null,
      },
    });
    console.log(`Added: ${job.customer} — ${job.address}`);
  }

  console.log(`\nDone — added ${clients.length} clients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
