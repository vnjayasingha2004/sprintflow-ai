import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  FolderKanban,
  Layers3,
  ListTodo,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dashboardHref = user ? "/dashboard" : "/sign-in?next=/dashboard";
  const dashboardLabel = user ? "Open dashboard" : "Sign in to dashboard";

  const features = [
    {
      icon: WandSparkles,
      label: "AI task planning",
      title: "Turn rough ideas into structured task plans",
      description:
        "Generate tasks, priorities, statuses, and acceptance criteria from prompts, files, or saved documents.",
    },
    {
      icon: FolderKanban,
      label: "Project workspaces",
      title: "Keep every project clean and organized",
      description:
        "Create dedicated project boards with documents, manual tasks, AI-generated tasks, and progress tracking.",
    },
    {
      icon: BarChart3,
      label: "Progress visibility",
      title: "Understand what is moving and what needs focus",
      description:
        "Track total tasks, active work, completion rate, high-priority items, and recent activity from one dashboard.",
    },
  ];

  const workflow = [
    {
      step: "01",
      title: "Create a project",
      description:
        "Start with a focused workspace for your idea, assignment, client project, or product feature.",
    },
    {
      step: "02",
      title: "Generate tasks with AI",
      description:
        "Use a prompt, uploaded requirement file, or saved document to create sprint-ready tasks.",
    },
    {
      step: "03",
      title: "Track and refine work",
      description:
        "Move tasks through the board, open task details, and ask AI for implementation guidance.",
    },
  ];

  return (
    <main className="app-shell-bg relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none fixed inset-0 soft-grid opacity-30" />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-slate-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-28 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-slate-600/10 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-semibold text-black">
            S
          </div>

          <div>
            <p className="text-sm font-semibold text-white">SprintFlow AI</p>
            <p className="text-xs text-white/45">AI planning workspace</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-white/55 md:flex">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#workflow" className="transition hover:text-white">
            Workflow
          </a>
          <a href="#security" className="transition hover:text-white">
            Security
          </a>
        </nav>

        <Link
          href={dashboardHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.1]"
        >
          {user ? "Dashboard" : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white/70 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            AI-powered project planning for focused builders
          </div>

          <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
            Plan projects faster without losing structure.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/60 sm:text-lg">
            SprintFlow AI helps you turn ideas, documents, and requirements into
            organized project boards with tasks, acceptance criteria, progress
            analytics, and task-specific AI guidance.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02] hover:bg-white/90"
            >
              {dashboardLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>

            {!user && (
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-3.5 font-medium text-white transition hover:bg-white/[0.1]"
              >
                Create account
              </Link>
            )}

            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-6 py-3.5 font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              Explore features
            </a>
          </div>

          <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
            {["Protected auth", "User-owned data", "AI task support"].map(
              (item) => (
                <div
                  key={item}
                  className="glass-card-soft rounded-3xl p-4 premium-card-hover"
                >
                  <CheckCircle2 className="mb-3 h-5 w-5 text-white/70" />
                  <p className="text-sm font-medium text-white">{item}</p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="glass-card relative overflow-hidden rounded-[36px] p-5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

          <div className="relative rounded-[28px] border border-white/10 bg-black/25 p-5">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Workspace overview</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Project planning board
                </h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Layers3 className="h-5 w-5 text-white/75" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Projects", "12"],
                ["Tasks", "48"],
                ["Done", "72%"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-xs text-white/45">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  title: "Build authentication flow",
                  status: "Done",
                  icon: ShieldCheck,
                },
                {
                  title: "Generate sprint task plan",
                  status: "In Progress",
                  icon: WandSparkles,
                },
                {
                  title: "Prepare dashboard analytics",
                  status: "Review",
                  icon: BarChart3,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="premium-card-hover flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                        <Icon className="h-4 w-4 text-white/70" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-white/40">
                          AI-assisted task
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/60">
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-sm text-white/50">Core features</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Everything needed to move from idea to execution.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="glass-card-soft premium-card-hover rounded-[32px] p-6"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                  <Icon className="h-5 w-5 text-white/75" />
                </div>

                <p className="text-sm text-white/45">{feature.label}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/55">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="workflow"
        className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="glass-card rounded-[36px] p-6 md:p-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm text-white/50">Workflow</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">
              A simple flow for project planning.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="rounded-[28px] border border-white/10 bg-black/25 p-6"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-black">
                  {item.step}
                </div>

                <h3 className="text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-white/55">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="security"
        className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="glass-card-soft rounded-[32px] p-6">
            <ShieldCheck className="mb-5 h-8 w-8 text-white/70" />
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Built around protected user workspaces.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/55">
              Projects, tasks, uploaded documents, and AI task conversations are
              scoped to the authenticated user.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                title: "Protected routes",
                description:
                  "Workspace pages redirect unauthenticated users to sign in.",
              },
              {
                icon: ListTodo,
                title: "User-owned tasks",
                description:
                  "Task pages only load records that belong to the current account.",
              },
              {
                icon: FileText,
                title: "Document context",
                description:
                  "Project documents stay attached to the correct user and project.",
              },
              {
                icon: FolderKanban,
                title: "Clean project boards",
                description:
                  "Every project keeps its own tasks, progress, documents, and AI support.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="glass-card-soft premium-card-hover rounded-[28px] p-5"
                >
                  <Icon className="mb-4 h-5 w-5 text-white/70" />
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/50">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="gradient-border overflow-hidden rounded-[36px] p-8 text-center md:p-12">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Ready to turn your next idea into a structured plan?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 md:text-base">
            Open your workspace and start building projects with AI-generated
            tasks, progress tracking, and task-level implementation support.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02] hover:bg-white/90"
            >
              {dashboardLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-white/40 md:flex-row md:items-center">
          <p>SprintFlow AI</p>
          <p>AI-powered project planning workspace</p>
        </div>
      </footer>
    </main>
  );
}