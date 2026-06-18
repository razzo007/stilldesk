import { LogIn } from "lucide-react";
import { useState } from "react";
import {
  registerWithPassword,
  sendPasswordReset,
  signInWithMicrosoft,
  signInWithPassword,
  updatePassword,
} from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import { usePlatformAuthSettings } from "./queries/auth";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";

interface LoginScreenProps {
  onDemo: () => void;
  onPreview: () => void;
  recoveryMode?: boolean;
  authError?: string;
  onRecoveryComplete?: () => void;
}

export function LoginScreen({
  onDemo,
  onPreview,
  recoveryMode = false,
  authError = "",
  onRecoveryComplete,
}: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: authSettings } = usePlatformAuthSettings();
  const ssoOnly = isSupabaseConfigured &&
    Boolean(authSettings?.enforce_microsoft_sso && !authSettings.allow_email_password);

  function friendlyAuthError(raw: string): string {
    const msg = raw.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
      return "No account found with these credentials. Check your email and password.";
    if (msg.includes("email not confirmed"))
      return "Confirm your email address first — check your inbox.";
    if (
      msg.includes("already registered") ||
      msg.includes("user already registered") ||
      msg.includes("email already") ||
      msg.includes("already exists") ||
      msg.includes("already been registered") ||
      msg.includes("account with this email already exists")
    )
      return "This email is already registered. Switch to Login to sign in.";
    if (msg.includes("weak password") || msg.includes("password should be"))
      return "Choose a stronger password — at least 6 characters.";
    if (msg.includes("rate limit") || msg.includes("too many requests"))
      return "Too many attempts. Wait a moment and try again.";
    return raw;
  }

  async function submitRecovery() {
    if (newPassword.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await updatePassword(newPassword);
      onRecoveryComplete?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!isSupabaseConfigured) {
      setError("No authentication backend configured. Use the demo below to explore the app.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    if (mode !== "forgot" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        await signInWithPassword(email.trim(), password);
      } else if (mode === "register") {
        await registerWithPassword(name.trim() || email.split("@")[0], email.trim(), password);
        setMode("login");
        setPassword("");
        setMessage("Account created — sign in below. Check your inbox if email confirmation is required.");
      } else {
        await sendPasswordReset(email.trim());
        setMessage("Password reset link sent — check your inbox.");
      }
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "Could not sign in.";
      const friendly = friendlyAuthError(raw);
      setError(friendly);
      if (friendly.includes("already registered") && mode === "register") {
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInMicrosoft() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await signInWithMicrosoft();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start Microsoft sign-in.");
      setLoading(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-y-auto bg-desk-bg px-4 py-10">
      <img
        alt=""
        className="pointer-events-none fixed inset-0 -z-20 h-dvh w-screen object-cover object-center opacity-80"
        src="/assets/stilldesk-cover.jpg"
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,20,17,0.18),rgba(18,20,17,0.72)_58%,rgba(18,20,17,0.86))]" />
      <section className="relative z-10 grid w-full max-w-6xl justify-items-end">
        <div className="glass-panel w-full max-w-md rounded-[1.7rem] p-6 md:p-9">
          <div>
            <img
              alt="StillDesk"
              className="h-20 w-full rounded-2xl border border-desk-border/70 object-cover object-center opacity-90"
              src="/assets/stilldesk-logo.jpg"
            />
            <p className="mt-5 text-sm font-medium text-desk-muted">Calm issue desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-desk-text">
              Create tickets for internal teams.
            </h1>
          </div>
          {children}
        </div>
      </section>
    </main>
  );

  // ── Suspended / blocked account ─────────────────────────────────────────────
  if (authError) {
    return shell(
      <div className="mt-8 grid gap-4">
        <p className="rounded-lg bg-desk-red px-4 py-3 text-sm text-desk-redText">{authError}</p>
        <p className="text-xs text-desk-muted">Contact your administrator to restore access.</p>
      </div>,
    );
  }

  // ── Password recovery ───────────────────────────────────────────────────────
  if (recoveryMode) {
    return shell(
      <form
        className="mt-8 grid gap-4"
        noValidate
        onSubmit={(e) => { e.preventDefault(); void submitRecovery(); }}
      >
        <p className="text-sm text-desk-muted">Enter your new password below.</p>
        <Input
          autoComplete="new-password"
          label="New password"
          name="new-password"
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          type="password"
          value={newPassword}
        />
        {error ? (
          <p className="rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">{error}</p>
        ) : null}
        <Button isLoading={loading} type="submit" variant="primary">
          Set new password
        </Button>
      </form>,
    );
  }

  // ── Main login form ─────────────────────────────────────────────────────────
  return shell(
    <>
      <div className="mt-8 grid gap-4">
        {/* Microsoft SSO — only when Supabase is configured */}
        {isSupabaseConfigured ? (
          <Button isLoading={loading} onClick={signInMicrosoft} variant="secondary">
            Continue with Microsoft
          </Button>
        ) : null}

        {isSupabaseConfigured && !ssoOnly ? (
          <p className="text-center text-xs text-desk-muted">or use email</p>
        ) : null}

        {ssoOnly ? (
          <p className="text-sm text-desk-muted">
            Your organization requires Microsoft sign-in.
          </p>
        ) : null}

        {/* Email / password form — always visible */}
        {!ssoOnly ? (
          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); void submit(); }}
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-3 rounded-lg border border-desk-border bg-desk-bg p-1 text-xs text-desk-muted">
                {(["login", "register", "forgot"] as const).map((item) => (
                  <button
                    className={`rounded-md px-2 py-2 capitalize ${
                      mode === item ? "bg-desk-soft text-desk-text" : ""
                    }`}
                    key={item}
                    onClick={() => { setMode(item); setError(""); setMessage(""); }}
                    type="button"
                  >
                    {item === "forgot" ? "Reset" : item}
                  </button>
                ))}
              </div>

              {mode === "register" ? (
                <Input
                  autoComplete="name"
                  label="Name"
                  name="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  value={name}
                />
              ) : null}

              <Input
                autoComplete="email"
                label="Email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                type="email"
                value={email}
              />

              {mode !== "forgot" ? (
                <Input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  label="Password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                  value={password}
                />
              ) : null}

              {message ? (
                <p className="rounded-lg bg-desk-green px-3 py-2 text-sm text-desk-greenText">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">
                  {error}
                </p>
              ) : null}

              <Button
                icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
                isLoading={loading}
                type="submit"
                variant="primary"
              >
                {mode === "login"
                  ? "Sign in"
                  : mode === "register"
                    ? "Create account"
                    : "Send reset link"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Demo / preview links */}
      <div className="mt-5 grid gap-2 border-t border-desk-border/50 pt-5">
        <button
          className="w-full text-center text-xs text-desk-muted transition-colors hover:text-desk-text"
          onClick={onDemo}
          type="button"
        >
          Explore with sample data — no sign-up needed
        </button>
        <button
          className="w-full text-center text-xs text-desk-muted transition-colors hover:text-desk-text"
          onClick={onPreview}
          type="button"
        >
          Try it with an empty desk
        </button>
      </div>
    </>,
  );
}
