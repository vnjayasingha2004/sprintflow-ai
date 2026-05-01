"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSupabasePage() {
  const supabase = useMemo(() => createClient(), []);

  const [message, setMessage] = useState("Not tested yet");
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    setMessage("Testing Supabase connection...");

    try {
      const { error } = await supabase.from("projects").select("*").limit(1);

      if (error) {
        setMessage(`Connected, but got DB message: ${error.message}`);
        return;
      }

      setMessage("Supabase connected successfully.");
    } catch (error) {
      console.error("Supabase test error:", error);
      setMessage("Something went wrong while testing Supabase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <h1 className="text-3xl font-semibold">Test Supabase</h1>

      <button
        onClick={testConnection}
        disabled={loading}
        className="mt-6 rounded-2xl bg-white px-5 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Testing..." : "Test Connection"}
      </button>

      <p className="mt-4 text-white/70">{message}</p>
    </main>
  );
}