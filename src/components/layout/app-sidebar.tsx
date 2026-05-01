"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "AI Planner",
    href: "/ai-planner",
    icon: Sparkles,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-zinc-950 md:flex md:flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-semibold text-black">
            S
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">SprintFlow AI</h2>
            <p className="text-sm text-white/50">Project planning workspace</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white text-black shadow-sm"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/50">Current plan</p>
          <h3 className="mt-1 text-base font-semibold text-white">
            Starter Workspace
          </h3>
          <p className="mt-2 text-sm text-white/60">
            AI task planning, progress tracking, and sprint visibility.
          </p>
        </div>
      </div>
    </aside>
  );
}