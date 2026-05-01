"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Flame,
  FolderKanban,
  ListTodo,
  LoaderCircle,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string | null;
};

type TaskStatus = "To Do" | "In Progress" | "Review" | "Done";
type TaskPriority = "High" | "Medium" | "Low";

type Task = {
  id: string;
  project_id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  acceptance_criteria: string[] | null;
  created_at: string;
};

function getStatusStyles(status: TaskStatus) {
  if (status === "Done") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "In Progress") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }

  if (status === "Review") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getPriorityStyles(priority: TaskPriority) {
  if (priority === "High") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  if (priority === "Medium") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getProjectHealth(progress: number) {
  if (progress >= 75) {
    return {
      label: "Healthy",
      className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    };
  }

  if (progress >= 35) {
    return {
      label: "Moving",
      className: "border-blue-400/20 bg-blue-400/10 text-blue-200",
    };
  }

  return {
    label: "Needs focus",
    className: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/sign-in?next=/dashboard");
        return;
      }

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (projectError) {
        setError(projectError.message);
        setLoading(false);
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (taskError) {
        setError(taskError.message);
        setLoading(false);
        return;
      }

      setProjects((projectData ?? []) as Project[]);
      setTasks((taskData ?? []) as Task[]);
      setLoading(false);
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const analytics = useMemo(() => {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;

    const todoTasks = tasks.filter((task) => task.status === "To Do").length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;
    const reviewTasks = tasks.filter((task) => task.status === "Review").length;
    const completedTasks = tasks.filter((task) => task.status === "Done").length;

    const highPriorityTasks = tasks.filter(
      (task) => task.priority === "High"
    ).length;

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const activeTasks = inProgressTasks + reviewTasks;

    return {
      totalProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      completedTasks,
      highPriorityTasks,
      completionRate,
      activeTasks,
    };
  }, [projects, tasks]);

  const stats = [
    {
      title: "Projects",
      value: analytics.totalProjects.toString(),
      subtext: "Active workspaces",
      icon: FolderKanban,
      accent: "from-blue-400/25 to-cyan-400/10",
    },
    {
      title: "Tasks",
      value: analytics.totalTasks.toString(),
      subtext: "Across every project",
      icon: ListTodo,
      accent: "from-violet-400/25 to-fuchsia-400/10",
    },
    {
      title: "Active",
      value: analytics.activeTasks.toString(),
      subtext: "In progress or review",
      icon: Activity,
      accent: "from-amber-400/25 to-orange-400/10",
    },
    {
      title: "Done",
      value: `${analytics.completionRate}%`,
      subtext: "Completion rate",
      icon: TrendingUp,
      accent: "from-emerald-400/25 to-teal-400/10",
    },
  ];

  const recentProjects = projects.slice(0, 5);
  const recentTasks = tasks.slice(0, 6);

  const projectProgress = recentProjects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const doneTasks = projectTasks.filter((task) => task.status === "Done");
    const progress =
      projectTasks.length > 0
        ? Math.round((doneTasks.length / projectTasks.length) * 100)
        : 0;

    return {
      project,
      taskCount: projectTasks.length,
      doneCount: doneTasks.length,
      progress,
      health: getProjectHealth(progress),
    };
  });

  const statusItems = [
    {
      label: "To Do",
      value: analytics.todoTasks,
      total: analytics.totalTasks,
      icon: ListTodo,
      dot: "bg-white/50",
    },
    {
      label: "In Progress",
      value: analytics.inProgressTasks,
      total: analytics.totalTasks,
      icon: Zap,
      dot: "bg-blue-300",
    },
    {
      label: "Review",
      value: analytics.reviewTasks,
      total: analytics.totalTasks,
      icon: Target,
      dot: "bg-amber-300",
    },
    {
      label: "Done",
      value: analytics.completedTasks,
      total: analytics.totalTasks,
      icon: CheckCircle2,
      dot: "bg-emerald-300",
    },
  ];

  if (loading) {
    return (
      <div className="glass-card flex min-h-[420px] items-center justify-center rounded-[32px] text-white/60">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Preparing your workspace dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="gradient-border relative overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-2xl shadow-black/20 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              SprintFlow AI command center
            </div>

            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Your projects, tasks, and AI plans in one clean view.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              See what is moving, what needs attention, and where your project
              work is becoming sprint-ready.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                Start a project
              </Link>

              <Link
                href="/ai-planner"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Sparkles className="h-4 w-4" />
                Build task plan
              </Link>
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Workspace completion</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {analytics.completionRate}%
                </p>
              </div>

              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(white ${analytics.completionRate}%, rgba(255,255,255,0.12) 0)`,
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                  {analytics.completedTasks}/{analytics.totalTasks || 0}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">High priority</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {analytics.highPriorityTasks}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Active work</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {analytics.activeTasks}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm text-white/75">
                <Flame className="h-4 w-4 text-amber-200" />
                Focus signal
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {analytics.highPriorityTasks > 0
                  ? `${analytics.highPriorityTasks} high-priority task(s) need attention.`
                  : "No high-priority blockers right now. Good momentum."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="glass-card-soft premium-card-hover relative overflow-hidden rounded-[30px] p-5"
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${stat.accent} blur-2xl`}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/50">{stat.title}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-white/45">{stat.subtext}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Icon className="h-5 w-5 text-white/80" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="glass-card border-white/10 text-white">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">
                  Work distribution
                </CardTitle>
                <p className="mt-1 text-sm text-white/50">
                  A quick pulse check across your task board.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <BarChart3 className="h-5 w-5 text-white/70" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {statusItems.map((item) => {
                const Icon = item.icon;
                const percent =
                  item.total > 0
                    ? Math.round((item.value / item.total) * 100)
                    : 0;

                return (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-black/25 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                          <Icon className="h-4 w-4 text-white/70" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-white/45">
                            {percent}% of workload
                          </p>
                        </div>
                      </div>

                      <span className="text-2xl font-semibold text-white">
                        {item.value}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${item.dot}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-xl">Today’s snapshot</CardTitle>
            <p className="text-sm text-white/50">
              A compact summary of your current workspace.
            </p>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {[
                ["Projects", analytics.totalProjects],
                ["All tasks", analytics.totalTasks],
                ["High priority", analytics.highPriorityTasks],
                ["Active tasks", analytics.activeTasks],
                ["Completed tasks", analytics.completedTasks],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                >
                  <span className="text-sm text-white/50">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-white/50">Overall completion</span>
                <span className="font-medium text-white">
                  {analytics.completionRate}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${analytics.completionRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="glass-card border-white/10 text-white">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Project health</CardTitle>
                <p className="mt-1 text-sm text-white/50">
                  Recent projects with progress and completion status.
                </p>
              </div>

              <Link
                href="/projects"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                View all
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {projectProgress.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <FolderKanban className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-4 font-semibold text-white">
                  No projects yet
                </h3>
                <p className="mt-2 text-sm text-white/45">
                  Start a new project to see health cards here.
                </p>
                <Link
                  href="/projects"
                  className="mt-5 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black"
                >
                  Create project
                </Link>
              </div>
            ) : (
              projectProgress.map((item) => (
                <Link
                  key={item.project.id}
                  href={`/projects/${item.project.id}`}
                  className="premium-card-hover block rounded-3xl border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-white">
                          {item.project.name}
                        </h3>

                        <Badge
                          className={`border text-xs ${item.health.className}`}
                        >
                          {item.health.label}
                        </Badge>
                      </div>

                      <p className="mt-2 line-clamp-1 text-sm text-white/45">
                        {item.project.description || "No description added."}
                      </p>
                    </div>

                    <ArrowUpRight className="h-5 w-5 shrink-0 text-white/40" />
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white/45">
                        {item.doneCount}/{item.taskCount} completed
                      </span>
                      <span className="font-medium text-white">
                        {item.progress}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-xl">Recent task activity</CardTitle>
            <p className="text-sm text-white/50">
              The latest tasks created or updated in your workspace.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <ListTodo className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-4 font-semibold text-white">No tasks yet</h3>
                <p className="mt-2 text-sm text-white/45">
                  Create tasks manually or generate them with AI Planner.
                </p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="premium-card-hover block rounded-3xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">
                      {task.title}
                    </h3>

                    <ArrowUpRight className="h-4 w-4 shrink-0 text-white/35" />
                  </div>

                  <p className="line-clamp-2 text-xs leading-5 text-white/45">
                    {task.description || "No description provided."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      className={`border text-xs ${getStatusStyles(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </Badge>

                    <Badge
                      className={`border text-xs ${getPriorityStyles(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="glass-card border-white/10 text-white">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Recent projects</CardTitle>
                <p className="mt-1 text-sm text-white/50">
                  Jump back into your latest workspaces.
                </p>
              </div>

              <Clock3 className="h-5 w-5 text-white/40" />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {recentProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/50">
                No projects yet.
              </div>
            ) : (
              recentProjects.map((project) => {
                const projectTaskCount = tasks.filter(
                  (task) => task.project_id === project.id
                ).length;

                return (
                  <div
                    key={project.id}
                    className="premium-card-hover flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {project.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/45">
                        {projectTaskCount} task(s) · created{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
                    >
                      Open
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}