import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Two separate accounts, because they do two separate jobs:
//   - SUPER_ADMIN logs into /admin to manage every customer business.
//   - The org owner logs into the regular dashboard to run one business's
//     day-to-day jobs. Your own cleaning company is organization #1 here,
//     so you can use the product yourself before selling it to anyone else.
async function main() {
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "";
  const superAdminName = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD before seeding.");
  }

  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: superAdminName,
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      mustChangePw: false,
    },
  });
  console.log(`Super admin account ready: ${superAdminEmail} — log in and use /admin`);

  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD || "";
  const ownerName = process.env.OWNER_NAME || "Owner";
  const orgName = process.env.OWNER_ORG_NAME || "BAB Cleaning";

  if (!ownerEmail || !ownerPassword) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD before seeding.");
  }
  if (ownerEmail === superAdminEmail) {
    throw new Error("OWNER_EMAIL and SUPER_ADMIN_EMAIL must be different — they're two separate accounts.");
  }

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!existingOwner) {
    const ownerHash = await bcrypt.hash(ownerPassword, 10);
    await prisma.organization.create({
      data: {
        name: orgName,
        propertyLimit: 500,
        monthlyPriceCents: 0,
        notes: "Internal — the product owner's own business, used to test the app before selling it.",
        users: {
          create: {
            name: ownerName,
            email: ownerEmail,
            passwordHash: ownerHash,
            role: "OWNER",
            mustChangePw: false,
          },
        },
      },
    });
    console.log(`Organization "${orgName}" created with owner account: ${ownerEmail}`);
    console.log("No jobs or employees were seeded — add them from the app.");
  } else {
    console.log(`Owner account already exists: ${ownerEmail} — skipping.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
