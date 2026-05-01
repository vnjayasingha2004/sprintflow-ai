"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
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

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/tasks")) return "Task Details";
  if (pathname.startsWith("/ai-planner")) return "AI Planner";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard Overview";
}

function getInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();

  if (!source) return "U";

  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AppHeader({
  userEmail,
  displayName,
}: {
  userEmail: string;
  displayName: string;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const initials = getInitials(displayName, userEmail);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <p className="text-xs text-white/50 sm:text-sm">
                Welcome back{displayName ? `, ${displayName}` : ""}
              </p>
              <h1 className="text-lg font-semibold text-white sm:text-xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 xl:flex">
              <Search className="h-4 w-4" />
              <span>Search projects or tasks</span>
            </div>

            <button
              type="button"
              className="hidden rounded-2xl border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white sm:block"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            <Link
              href="/settings"
              className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10 lg:flex"
              title="Edit profile"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-semibold text-black">
                {initials}
              </div>

              <div className="max-w-[170px]">
                <p className="truncate text-sm font-medium text-white">
                  {displayName || "Edit profile"}
                </p>
                <p className="truncate text-xs text-white/45">{userEmail}</p>
              </div>
            </Link>

            <Link
              href="/settings"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black lg:hidden"
              title="Edit profile"
            >
              <UserRound className="h-5 w-5" />
            </Link>

            <div className="hidden sm:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <aside className="relative flex h-full w-[85%] max-w-sm flex-col border-r border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white font-semibold text-black">
                  S
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    SprintFlow AI
                  </h2>
                  <p className="text-sm text-white/50">Workspace</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 px-5 py-4">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {displayName || "Edit profile"}
                  </p>
                  <p className="truncate text-xs text-white/45">{userEmail}</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
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
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}