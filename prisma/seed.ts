import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function tempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";

const SEED_JOBS = [
  { customer: "Madelaine Fontenot", serviceType: null, address: "103 Dusty Ridge Drive", city: "Youngsville", state: "LA", price: "$20/hour", phone: "(337) 446-5769", schedule: "Mon/Wed/Fri, 6:30–9:30 AM" },
  { customer: "Hannah Hart", property: "Hart of Broussard", serviceType: STR_TYPE, address: "300 Avenue B, Apartment B", city: "Broussard", state: "LA", price: "$60/clean", phone: "(337) 501-4352", accessCode: "8450", notes: "Cleaning closet code: 8450" },
  { customer: "Hannah Hart", property: "Treehouse", serviceType: STR_TYPE, address: "120 Wellspring Way", city: "Youngsville", state: "LA", price: "$55/clean", phone: "(337) 501-4352", accessCode: "7777", keyLocation: "Lockbox under the glass table on the front porch", suppliesLocation: "Gray tote behind the laundry room" },
  { customer: "Hannah Hart", property: "Home Away From Home", serviceType: STR_TYPE, address: "925 Patricia Street", city: "Rayne", state: "LA", price: "$75/clean", phone: "(337) 501-4352", accessCode: "5014", notes: "Cleaning closet code: 1996" },
  { customer: "Hannah Hart", property: "Buchanan Lofts – Apt 4", serviceType: STR_TYPE, address: "403 South Buchanan Street, Apartment 4", city: "Lafayette", state: "LA", price: "$55/clean", phone: "(337) 501-4352", accessCode: "0907 (lobby)" },
  { customer: "Hannah Hart", property: "Buchanan Lofts – Apt 8", serviceType: STR_TYPE, address: "403 South Buchanan Street, Apartment 8", city: "Lafayette", state: "LA", phone: "(337) 501-4352", accessCode: "0907 (lobby)" },
  { customer: "Hannah Hart", serviceType: STR_TYPE, address: "1121 South Washington Street", city: "Lafayette", state: "LA", phone: "(337) 501-4352", accessCode: "Front door: not yet provided", notes: "Cleaning closet code: 337" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "1510 Kaliste Saloom Road, Apartment 304", city: "Lafayette", state: "LA", price: "$120/clean", phone: "(941) 799-1538" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "1510 Kaliste Saloom Road, Apartment 301", city: "Lafayette", state: "LA", price: "$120/clean", phone: "(941) 799-1538", accessCode: "1015", suppliesLocation: "Not yet provided" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "204 Steiner Oaks", city: "Lafayette", state: "LA", price: "$120/clean", phone: "(941) 799-1538", accessCode: "000466", keyLocation: "Above the refrigerator, in the cabinet", suppliesLocation: "Closet to the left of the refrigerator, at the bottom" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "206 Steiner Oaks", city: "Lafayette", state: "LA", price: "$120/clean", phone: "(941) 799-1538", accessCode: "000666", keyLocation: "Above the refrigerator, in the cabinet", suppliesLocation: "Closet to the left of the refrigerator, at the bottom" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "121 Mayberry Grove", city: "Youngsville", state: "LA", price: "$120/clean", phone: "(941) 799-1538", accessCode: "Not yet provided" },
  { customer: "Lynne Bermel", serviceType: STR_TYPE, address: "117 Mayberry Grove", city: "Youngsville", state: "LA", price: "$120/clean", phone: "(941) 799-1538", accessCode: "082210", suppliesLocation: "Cubby behind the washer and dryer" },
  { customer: "Theresa LeBlanc", serviceType: STR_TYPE, address: "804 Barrow Street", city: "New Iberia", state: "LA", price: "$100/clean", phone: "(337) 247-8816" },
  { customer: "Meagan Perkins", address: "201 Bon Vie Drive", city: "Lafayette", state: "LA", price: "$125/clean", phone: "(337) 466-5994", schedule: "1st & 3rd Thursday monthly, 10 AM (4 hrs)" },
  { customer: "Faye Veverka", address: "3277 Bella Road", city: "Maurice", state: "LA", price: "$125/clean", phone: "(802) 353-9832", schedule: "Date/time not yet scheduled" },
  { customer: "Becky Sanders", address: "103 1/2 Vital Street", city: "Lafayette", state: "LA", price: "$20/hour", phone: "(575) 921-5024", schedule: "Weekly, day/time varies" },
  { customer: "Nicole Ferguson", address: "817 Omega Drive", city: "Lafayette", state: "LA", price: "$125/clean", phone: "(479) 530-1117", schedule: "Monthly, date/time varies" },
];

const SEED_EMPLOYEES = [{ name: "Kirstin Nash", email: "kirstin.nash@icloud.com" }];

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  const ownerPassword = process.env.OWNER_PASSWORD || "";
  const ownerName = process.env.OWNER_NAME || "Owner";

  if (!ownerEmail || !ownerPassword) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD before seeding.");
  }

  const ownerHash = await bcrypt.hash(ownerPassword, 10);
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: { name: ownerName, email: ownerEmail, passwordHash: ownerHash, role: "OWNER", mustChangePw: false },
  });
  console.log(`Owner account ready: ${ownerEmail}`);

  const employeeCount = await prisma.user.count({ where: { role: { in: ["EMPLOYEE", "ADMIN"] } } });
  if (employeeCount === 0) {
    for (const e of SEED_EMPLOYEES) {
      const pw = tempPassword();
      const passwordHash = await bcrypt.hash(pw, 10);
      await prisma.user.create({
        data: { name: e.name, email: e.email, passwordHash, role: "EMPLOYEE", mustChangePw: true },
      });
      console.log(`Employee created: ${e.name} <${e.email}> — temp password: ${pw}`);
    }
  }

  const jobCount = await prisma.job.count();
  if (jobCount === 0) {
    for (const j of SEED_JOBS) {
      await prisma.job.create({ data: j });
    }
    console.log(`Seeded ${SEED_JOBS.length} jobs.`);
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
