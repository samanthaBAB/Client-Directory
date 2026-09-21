import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    homeownerProfile: user.homeownerProfile,
    cleanerProfile: user.cleanerProfile,
  });
}
