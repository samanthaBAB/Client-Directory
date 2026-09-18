import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password.",
  default: "Something went wrong signing you in. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=${err.type}`);
      }
      throw err;
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>BAB Tasker</h1>
        <p className="sub">Sign in to see your jobs and log your work.</p>
        {error && (
          <div className="auth-error">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default}
          </div>
        )}
        <form action={loginAction} className="auth-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn block" type="submit">Sign In</button>
        </form>
        <p className="auth-caption">
          Don&apos;t have an account yet? Ask your employer to set one up for you.
        </p>
      </div>
    </div>
  );
}
