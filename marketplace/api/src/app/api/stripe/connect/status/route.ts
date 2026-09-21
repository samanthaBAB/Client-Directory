import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }

  if (!user.cleanerProfile.stripeAccountId) {
    return NextResponse.json({ onboarded: false });
  }

  const account = await stripe.accounts.retrieve(user.cleanerProfile.stripeAccountId);
  const onboarded = Boolean(account.charges_enabled && account.details_submitted);

  if (onboarded !== user.cleanerProfile.stripeOnboarded) {
    await prisma.cleanerProfile.update({
      where: { id: user.cleanerProfile.id },
      data: { stripeOnboarded: onboarded },
    });
  }

  return NextResponse.json({ onboarded });
}
