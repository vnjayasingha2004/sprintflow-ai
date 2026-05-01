"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, LoaderCircle, Mail, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setError(error?.message || "Could not load user profile.");
        setLoading(false);
        return;
      }

      const metadata = user.user_metadata as {
        full_name?: string;
      };

      setEmail(user.email ?? "");
      setDisplayName(metadata.full_name ?? "");
      setLoading(false);
    }

    void loadUser();
  }, [supabase]);

  async function handleUpdateProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSavingProfile(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim(),
      },
    });

    if (error) {
      setError(error.message);
      setSavingProfile(false);
      return;
    }

    setMessage("Profile updated successfully.");
    setSavingProfile(false);
  }

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSavingPassword(true);
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      setSavingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
    setSavingPassword(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white/60">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-white/50">Workspace</p>
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-white/60">
          Manage your SprintFlow AI profile and account security.
        </p>
      </div>

      {(error || message) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/20 bg-red-500/10 text-red-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={handleUpdateProfile}
          className="rounded-[28px] border border-white/10 bg-white/5 p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <UserRound className="h-5 w-5 text-white/70" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Profile details
              </h2>
              <p className="text-sm text-white/50">
                Update the name shown in your workspace.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Display name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/60">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                Email changing can be added later with confirmation handling.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>

        <form
          onSubmit={handleUpdatePassword}
          className="rounded-[28px] border border-white/10 bg-white/5 p-6"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <KeyRound className="h-5 w-5 text-white/70" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                Change password
              </h2>
              <p className="text-sm text-white/50">
                Update your login password.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/30"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-medium text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPassword ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {savingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}