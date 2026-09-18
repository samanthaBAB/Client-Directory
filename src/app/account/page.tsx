import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please enter a valid email address.",
  taken: "That email is already in use by another account.",
  wrong: "Your current password is incorrect.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { error } = await searchParams;

  async function updateAccountAction(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const password = String(formData.get("password") ?? "");

    if (!EMAIL_RE.test(email)) redirect("/account?error=invalid");

    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) redirect("/login");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) redirect("/account?error=wrong");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) redirect("/account?error=taken");

    await prisma.user.update({
      where: { id: user.id },
      data: { name: name || user.name, email },
    });

    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Account Settings</h1>
        <p className="sub">Update your name or login email. You'll be signed out afterward and can log back in with your new email and current password.</p>
        {error && <div className="auth-error">{ERROR_MESSAGES[error] ?? "Something went wrong."}</div>}
        <form action={updateAccountAction} className="auth-form">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" defaultValue={session.user.name ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="email">Login email</label>
            <input id="email" name="email" type="email" defaultValue={session.user.email ?? ""} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Current password (to confirm it's you)</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn block" type="submit">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
