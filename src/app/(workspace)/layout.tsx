import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const metadata = user.user_metadata as {
    full_name?: string;
  };

  return (
    <div className="app-shell-bg min-h-screen text-white">
      <AppSidebar />

      <div className="min-h-screen md:pl-72">
        <AppHeader
          userEmail={user.email ?? ""}
          displayName={metadata.full_name ?? ""}
        />

        <main className="relative px-4 py-6 sm:px-6 md:px-8 md:py-8">
  <div className="pointer-events-none fixed inset-0 -z-10 soft-grid opacity-40" />
  {children}
</main>
      </div>
    </div>
  );
}