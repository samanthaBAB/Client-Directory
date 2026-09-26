import { redirect } from "next/navigation";
import Link from "next/link";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

const ERROR_MESSAGES: Record<string, string> = {
  short: "New password must be at least 8 characters.",
  mismatch: "New passwords don't match.",
  wrong: "Your current password is incorrect.",
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { error } = await searchParams;

  async function changePasswordAction(formData: FormData) {
    "use server";
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (next.length < 8) redirect("/change-password?error=short");
    if (next !== confirm) redirect("/change-password?error=mismatch");

    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) redirect("/login");

    const valid = await bcrypt.compare(current, user.passwordHash);
    if (!valid) redirect("/change-password?error=wrong");

    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePw: false },
    });

    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {!session.user.mustChangePw && (
          <Link className="link-btn" href="/" style={{ display: "inline-block", marginBottom: 14 }}>&larr; Back to Dashboard</Link>
        )}
        <h1>Set a New Password</h1>
        <p className="sub">
          {session.user.mustChangePw
            ? "This is either your first sign-in or your password was reset. Choose a new password to continue."
            : "Update your password below."}
        </p>
        {error && <div className="auth-error">{ERROR_MESSAGES[error] ?? "Something went wrong."}</div>}
        <form action={changePasswordAction} className="auth-form">
          <div className="field">
            <label htmlFor="current">Current / temporary password</label>
            <input id="current" name="current" type="password" required autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="next">New password</label>
            <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <button className="btn block" type="submit">Save New Password</button>
        </form>
      </div>
    </div>
  );
}
