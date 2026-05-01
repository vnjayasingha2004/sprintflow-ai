"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function getCurrentNextPath() {
  if (typeof window === "undefined") return "/dashboard";

  const params = new URLSearchParams(window.location.search);
  return getSafeRedirect(params.get("next"));
}

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

 

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    const cleanedEmail = email.trim().toLowerCase();
    const cleanedDisplayName = displayName.trim();
    const nextPath = getCurrentNextPath();

    if (!cleanedEmail || !password) {
      const message = "Email and password are required.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      const message = "Password must be at least 6 characters.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(
          nextPath
        )}`,
        data: {
          full_name: cleanedDisplayName,
        },
      },
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      toast.success("Account created.");
      router.replace(nextPath);
      router.refresh();
      return;
    }

    const successMessage =
      "Account created. Check your email to confirm your account, then sign in.";

    setMessage(successMessage);
    toast.success("Account created. Check your email.");
    setLoading(false);
  }

  return (
    <main className="app-shell-bg relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 soft-grid opacity-30" />

      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-slate-300/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-32 h-96 w-96 rounded-full bg-white/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-slate-500/[0.055] blur-3xl" />

      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="hidden lg:block">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 backdrop-blur transition hover:bg-white/[0.09]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-black">
              S
            </div>
            SprintFlow AI
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 shadow-2xl shadow-black/20 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Create your planning workspace
          </div>

          <h1 className="mt-6 max-w-3xl text-balance text-6xl font-semibold tracking-tight text-white">
            Start planning projects with AI from day one.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/58">
            Create your account, save projects, generate sprint-ready tasks,
            upload documents, and keep every workspace separated by user.
          </p>

          <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-3">
            {[
              "Private workspace",
              "AI task generator",
              "Progress tracking",
            ].map((item) => (
              <div
                key={item}
                className="glass-card-soft premium-card-hover rounded-3xl p-5"
              >
                <CheckCircle2 className="mb-4 h-5 w-5 text-white/70" />
                <p className="text-sm font-medium text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link
              href="/"
              className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/75 backdrop-blur"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-semibold text-black">
                S
              </div>
              SprintFlow AI
            </Link>
          </div>

          <div className="glass-card relative overflow-hidden rounded-[36px] p-6 shadow-2xl sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/[0.045] blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06]">
                <ShieldCheck className="h-6 w-6 text-white/75" />
              </div>

              <p className="text-sm font-medium text-white/50">
                SprintFlow AI
              </p>

              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                Create account
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/55">
                Create your workspace and start planning projects faster.
              </p>

              <form onSubmit={handleSignUp} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Name
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-white/25 focus-within:bg-black/40">
                    <UserRound className="h-5 w-5 text-white/35" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Email
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-white/25 focus-within:bg-black/40">
                    <Mail className="h-5 w-5 text-white/35" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Password
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 transition focus-within:border-white/25 focus-within:bg-black/40">
                    <KeyRound className="h-5 w-5 text-white/35" />
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-sm text-white/55">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="font-semibold text-white underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            Your saved projects and AI-generated tasks stay attached to your
            account.
          </p>
        </div>
      </section>
    </main>
  );
}