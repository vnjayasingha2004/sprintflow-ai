"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  FolderKanban,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id?: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/sign-in?next=/projects");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Fetch projects error:", error);
        setError(error.message);
        setProjects([]);
        toast.error(error.message);
      } else {
        setProjects((data || []) as Project[]);
      }

      setLoading(false);
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter((project) => {
      const nameMatch = project.name.toLowerCase().includes(query);
      const descriptionMatch = (project.description || "")
        .toLowerCase()
        .includes(query);

      return nameMatch || descriptionMatch;
    });
  }, [projects, searchQuery]);

  const latestProject = projects[0] ?? null;

  async function handleCreateProject() {
    if (!name.trim()) {
      const message = "Project name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      router.replace("/sign-in?next=/projects");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name: name.trim(),
          description: description.trim() || null,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Create project error:", error);
      setError(error.message);
      setSaving(false);
      toast.error(error.message);
      return;
    }

    toast.success("Project created successfully.");

    setName("");
    setDescription("");
    setSaving(false);

    if (data?.id) {
      router.push(`/projects/${data.id}`);
    }
  }

  return (
    <div className="space-y-8">
      <section className="gradient-border relative overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-2xl shadow-black/20 backdrop-blur">
              <FolderKanban className="h-4 w-4" />
              Project workspace
            </div>

            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Build cleaner project spaces for every idea.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Create projects, attach documents, generate AI task plans, and
              keep every sprint-ready task organized in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#create-project"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                Start a new project
              </a>

              <Link
                href="/ai-planner"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <WandSparkles className="h-4 w-4" />
                Generate tasks with AI
              </Link>
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Total projects</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-white">
                  {projects.length}
                </p>
              </div>

              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10">
                <Target className="h-9 w-9 text-white/75" />
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm text-white/50">Latest project</p>

              {latestProject ? (
                <>
                  <p className="mt-2 line-clamp-1 font-semibold text-white">
                    {latestProject.name}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Created {formatDate(latestProject.created_at)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/60">
                  No projects yet. Create your first workspace below.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div
          id="create-project"
          className="glass-card relative overflow-hidden rounded-[32px] p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/60">
              <Plus className="h-4 w-4" />
              New workspace
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Start a new project
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Give your project a clear name and short description. You can add
              documents, tasks, and AI plans after it is created.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Project name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: SprintFlow Mobile Polish"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/30 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  className="min-h-[150px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/30 focus:bg-black/40"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateProject}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating project...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create project
                  </>
                )}
              </button>

              <p className="text-xs leading-5 text-white/35">
                Tip: Keep the name simple. You can use the AI Planner later to
                generate tasks into this project.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-white/50">Saved workspaces</p>
              <h2 className="text-2xl font-semibold text-white">
                Your projects
              </h2>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:min-w-[320px]">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-white/50">
                {loading
                  ? "Loading projects..."
                  : `${filteredProjects.length} of ${projects.length} project(s)`}
              </span>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm text-white/45 transition hover:text-white"
                >
                  Clear search
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-5 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-white/10 bg-black/25 p-5"
                  >
                    <div className="mb-5 h-11 w-11 rounded-2xl bg-white/10" />
                    <div className="mb-3 h-5 w-40 rounded-full bg-white/10" />
                    <div className="mb-2 h-4 w-full rounded-full bg-white/10" />
                    <div className="h-4 w-3/4 rounded-full bg-white/10" />
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
                  <FolderKanban className="h-7 w-7 text-white/70" />
                </div>

                <h3 className="mt-5 text-xl font-semibold text-white">
                  No projects yet
                </h3>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
                  Create your first project to start organizing tasks, uploading
                  requirement documents, and generating AI plans.
                </p>

                <a
                  href="#create-project"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Create your first project
                </a>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-10 text-center">
                <Search className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-5 text-xl font-semibold text-white">
                  No matching projects
                </h3>
                <p className="mt-3 text-sm text-white/50">
                  Try searching with a different keyword.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.04 }}
                    className="premium-card-hover group relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-5"
                  >
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/5 blur-2xl transition group-hover:bg-blue-400/10" />

                    <div className="relative">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <FolderKanban className="h-5 w-5 text-white/80" />
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/45">
                          {formatDate(project.created_at)}
                        </div>
                      </div>

                      <h3 className="line-clamp-2 text-xl font-semibold text-white">
                        {project.name}
                      </h3>

                      <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-white/55">
                        {project.description || "No description provided yet."}
                      </p>

                      <div className="mt-6 flex items-center justify-between gap-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
                        >
                          Open project
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/ai-planner?projectId=${project.id}`}
                          className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white lg:inline-flex"
                        >
                          <Sparkles className="h-4 w-4" />
                          Plan
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}