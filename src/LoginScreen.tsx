import { LogIn } from "lucide-react";
import { useState } from "react";
import { registerWithPassword, sendPasswordReset, signInWithPassword } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";

interface LoginScreenProps {
  onDemo: () => void;
}

export function LoginScreen({ onDemo }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!isSupabaseConfigured) {
      onDemo();
      return;
    }

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (mode !== "forgot" && password.length < 6) {
      setError("Use at least 6 characters for password.");
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
        setMessage("Account created. If email confirmation is on, check your inbox.");
      } else {
        await sendPasswordReset(email.trim());
        setMessage("Password reset link sent.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-desk-bg px-4 py-10">
      <img
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        src="/assets/stilldesk-cover.jpg"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,20,17,0.18),rgba(18,20,17,0.72)_58%,rgba(18,20,17,0.86))]" />
      <section className="relative z-10 grid w-full max-w-6xl justify-items-end">
        <div className="glass-panel w-full max-w-md rounded-[1.7rem] p-6 md:p-9">
          <div>
            <img
              alt="StillDesk"
              className="h-20 w-full rounded-2xl border border-desk-border/70 object-cover object-center opacity-90"
              src="/assets/stilldesk-logo.jpg"
            />
            <p className="mt-5 text-sm font-medium text-desk-muted">Calm issue desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-desk-text">Create tickets for internal teams.</h1>
            <p className="mt-3 text-sm leading-6 text-desk-muted">
              Raise. Assign. Discuss. Fix. Verify. Close.
            </p>
          </div>

        <div className="mt-8 grid gap-4">
          <div className="grid grid-cols-3 rounded-lg border border-desk-border bg-desk-bg p-1 text-xs text-desk-muted">
            {(["login", "register", "forgot"] as const).map((item) => (
              <button
                className={`rounded-md px-2 py-2 capitalize ${mode === item ? "bg-desk-soft text-desk-text" : ""}`}
                key={item}
                onClick={() => {
                  setMode(item);
                  setError("");
                  setMessage("");
                }}
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
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              value={name}
            />
          ) : null}
          <Input
            autoComplete="email"
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
          {mode !== "forgot" ? (
            <Input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              label="Password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          ) : null}
          {message ? <p className="rounded-lg bg-desk-green px-3 py-2 text-sm text-desk-greenText">{message}</p> : null}
          {error ? <p className="rounded-lg bg-desk-red px-3 py-2 text-sm text-desk-redText">{error}</p> : null}
          <Button
            icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
            isLoading={loading}
            onClick={submit}
            variant="primary"
          >
            {!isSupabaseConfigured
              ? "Open demo desk"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </div>

        {!isSupabaseConfigured ? (
          <p className="mt-5 text-xs leading-5 text-desk-muted">
            Create tickets for internal teams to fast up the work.
          </p>
        ) : null}
        </div>
      </section>
    </main>
  );
}
