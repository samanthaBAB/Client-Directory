import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";

// Public endpoint behind the /get-started marketing page's contact form.
// No login, no organization — this is how a stranger reaches Samantha
// about buying the product, so it just texts her rather than writing
// anywhere in the multi-tenant data model.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const businessName = String(body.businessName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: "Name and at least an email or phone number are required." }, { status: 400 });
  }

  const notifyPhone = process.env.LEAD_NOTIFY_PHONE;
  const lines = [
    `BAB Tasker lead: ${name}${businessName ? ` (${businessName})` : ""}`,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    message ? `Message: ${message}` : null,
  ].filter(Boolean);

  const result = await sendSms(notifyPhone, lines.join("\n"));
  console.log("[contact] new lead", { name, businessName, email, phone, message, smsSent: result.sent });

  return NextResponse.json({ ok: true });
}
