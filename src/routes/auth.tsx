import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { recordEvent } from "@/lib/moderation-client";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in or sign up — Sellora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "otp">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(8).fill(""));
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/onboarding" });
  }, [user, loading, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 7) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    const next = [...otp];
    for (let i = 0; i < 8; i++) next[i] = text[i] || "";
    setOtp(next);
    const focusIdx = Math.min(text.length, 7);
    otpRefs.current[focusIdx]?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (isDisposableEmail(email)) {
          toast.error("Disposable/temporary email addresses are not allowed. Please use a permanent email.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        // After signup, send OTP for email verification
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (otpErr) {
          toast.success("Account created! Check your email for verification.");
        } else {
          toast.success("Account created! Enter the 8-digit code sent to your email.");
          setMode("otp");
          setResendCooldown(60);
        }
      } else if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const uid = data.user?.id ?? null;
        void recordEvent({ type: "login", userId: uid, metadata: { email } });
        toast.success("Welcome back!");
      } else if (mode === "forgot") {
        if (isDisposableEmail(email)) {
          toast.error("Disposable email addresses are not allowed.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the complete verification code.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      const uid = data.user?.id ?? null;
      void recordEvent({ type: "signup", userId: uid, metadata: { email } });
      toast.success("Email verified! Welcome to Sellora.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      toast.success("New code sent to your email.");
      setResendCooldown(60);
      setOtp(Array(8).fill(""));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "otp") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[image:var(--gradient-soft)] px-4">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Store className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary">Sellora</span>
        </Link>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <h2 className="mb-1 text-lg font-bold">Verify your email</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Enter the 8-digit code sent to <strong>{email}</strong>
          </p>
          <div className="mb-4 flex justify-center gap-1.5" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-11 w-9 rounded-md border border-border bg-background text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
              />
            ))}
          </div>
          <button
            onClick={verifyOtp}
            disabled={busy}
            className="mb-3 h-11 w-full rounded-md bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify code"}
          </button>
          <div className="text-center">
            <button
              onClick={resendOtp}
              disabled={busy || resendCooldown > 0}
              className="text-sm text-primary underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
          <button
            onClick={() => setMode("signin")}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[image:var(--gradient-soft)] px-4">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Store className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary">Sellora</span>
        </Link>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <h2 className="mb-1 text-lg font-bold">Forgot password?</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <button
              disabled={busy}
              className="h-11 w-full rounded-md bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <button
            onClick={() => setMode("signin")}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[image:var(--gradient-soft)] px-4">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <Store className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold text-primary">Sellora</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <div className="mb-4 flex rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === "signin" ? "bg-card shadow" : "text-muted-foreground"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${mode === "signup" ? "bg-card shadow" : "text-muted-foreground"}`}
          >
            Sign up
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-primary underline"
              >
                Forgot password?
              </button>
            </div>
          )}
          <button
            disabled={busy}
            className="h-11 w-full rounded-md bg-[image:var(--gradient-primary)] text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
