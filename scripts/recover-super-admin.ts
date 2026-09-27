import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

async function main() {
  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" } });
  if (admins.length === 0) {
    throw new Error("No SUPER_ADMIN account exists yet — none to recover.");
  }

  for (const admin of admins) {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash, mustChangePw: true },
    });
    console.log(`Super admin: ${admin.email}`);
    console.log(`New temporary password: ${tempPassword}`);
    console.log("You'll be asked to set your own password on next login.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
