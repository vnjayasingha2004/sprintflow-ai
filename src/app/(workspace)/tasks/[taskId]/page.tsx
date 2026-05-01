"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  ExternalLink,
  FileText,
  LoaderCircle,
  MessageSquare,
  RefreshCcw,
  Send,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

type Project = {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
};

type TaskBreakdown = {
  summary: string;
  steps: string[];
  technicalNotes: string[];
  testingChecklist: string[];
};

type TaskAIDetailsRow = {
  id: string;
  task_id: string;
  user_id: string | null;
  summary: string | null;
  steps: string[] | null;
  technical_notes: string[] | null;
  testing_checklist: string[] | null;
  created_at: string;
  updated_at: string;
};

type TaskAIMessage = {
  id: string;
  task_id: string;
  user_id: string | null;
  role: "user" | "assistant";
  message: string;
  created_at: string;
};

type ProjectDocument = {
  id: string;
  project_id: string;
  user_id: string | null;
  file_name: string;
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const statusOptions: TaskStatus[] = ["To Do", "In Progress", "Review", "Done"];

const quickPrompts = [
  "Break this into beginner-friendly steps.",
  "What should I implement first?",
  "What should I test for this task?",
  "Explain this task like a senior developer.",
];

function getPriorityStyles(priority: TaskPriority) {
  if (priority === "High") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  if (priority === "Medium") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getPriorityGlow(priority: TaskPriority) {
  if (priority === "High") return "bg-red-400/20";
  if (priority === "Medium") return "bg-amber-400/20";
  return "bg-white/10";
}

function getStatusStyles(status: TaskStatus) {
  if (status === "Done") {
    return {
      chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
      dot: "bg-emerald-300",
      label: "Ready",
    };
  }

  if (status === "In Progress") {
    return {
      chip: "border-blue-400/20 bg-blue-400/10 text-blue-100",
      dot: "bg-blue-300",
      label: "Moving",
    };
  }

  if (status === "Review") {
    return {
      chip: "border-amber-400/20 bg-amber-400/10 text-amber-100",
      dot: "bg-amber-300",
      label: "Checking",
    };
  }

  return {
    chip: "border-white/10 bg-white/5 text-white/70",
    dot: "bg-white/45",
    label: "Planned",
  };
}

function mapTaskAIDetailsRowToBreakdown(row: TaskAIDetailsRow): TaskBreakdown {
  return {
    summary: row.summary || "",
    steps: row.steps || [],
    technicalNotes: row.technical_notes || [],
    testingChecklist: row.testing_checklist || [],
  };
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TaskDetailsPage() {
  const router = useRouter();
  const params = useParams<{ taskId: string }>();

  const taskId = Array.isArray(params?.taskId)
    ? params.taskId[0]
    : params?.taskId;

  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [taskBreakdown, setTaskBreakdown] = useState<TaskBreakdown | null>(
    null
  );
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const [messages, setMessages] = useState<TaskAIMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;

    async function loadTaskPage() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace(`/sign-in?next=/tasks/${taskId}`);
        return;
      }

      setUserId(user.id);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (taskError) {
        setError(taskError.message);
        toast.error(taskError.message);
        setLoading(false);
        return;
      }

      if (!taskData) {
        const message = "Task not found or you do not have access to it.";
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      const loadedTask = taskData as Task;
      setTask(loadedTask);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", loadedTask.project_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (projectError) {
        setError(projectError.message);
        toast.error(projectError.message);
        setLoading(false);
        return;
      }

      setProject((projectData ?? null) as Project | null);

      const { data: breakdownData, error: breakdownError } = await supabase
        .from("task_ai_details")
        .select("*")
        .eq("task_id", loadedTask.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (breakdownError) {
        setError(breakdownError.message);
        toast.error(breakdownError.message);
      }

      if (breakdownData) {
        setTaskBreakdown(
          mapTaskAIDetailsRowToBreakdown(breakdownData as TaskAIDetailsRow)
        );
      }

      const { data: messageData, error: messageError } = await supabase
        .from("task_ai_messages")
        .select("*")
        .eq("task_id", loadedTask.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (messageError) {
        setError(messageError.message);
        toast.error(messageError.message);
      } else {
        setMessages((messageData ?? []) as TaskAIMessage[]);
      }

      const { data: documentData, error: documentError } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", loadedTask.project_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (documentError) {
        setError(documentError.message);
        toast.error(documentError.message);
      } else {
        setDocuments((documentData ?? []) as ProjectDocument[]);
      }

      setLoading(false);
    }

    void loadTaskPage();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, taskId]);

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task || !userId) return;

    setUpdatingStatus(true);
    setError("");

    const previousTask = task;
    setTask({ ...task, status: newStatus });

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (error) {
      setTask(previousTask);
      setError(error.message);
      toast.error(error.message);
    } else {
      toast.success("Task status updated.");
    }

    setUpdatingStatus(false);
  }

  async function handleGenerateBreakdown() {
    if (!task || !project || !userId) return;

    setLoadingBreakdown(true);
    setError("");

    try {
      const response = await fetch("/api/ai/task-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: project.name,
          title: task.title,
          description: task.description,
          acceptanceCriteria: task.acceptance_criteria ?? [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate task breakdown.");
      }

      if (!data.breakdown) {
        throw new Error("No breakdown was returned from the server.");
      }

      const breakdown = data.breakdown as TaskBreakdown;

      setTaskBreakdown(breakdown);

      const { error: saveError } = await supabase
        .from("task_ai_details")
        .upsert(
          [
            {
              task_id: task.id,
              user_id: userId,
              summary: breakdown.summary,
              steps: breakdown.steps,
              technical_notes: breakdown.technicalNotes,
              testing_checklist: breakdown.testingChecklist,
            },
          ],
          {
            onConflict: "task_id",
          }
        );

      if (saveError) {
        throw new Error(saveError.message);
      }

      toast.success("AI breakdown generated.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating task breakdown.";

      setError(message);
      toast.error(message);
    } finally {
      setLoadingBreakdown(false);
    }
  }

  async function handleSendQuestion(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();

    if (!task || !project || !userId) return;

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) return;

    setSendingQuestion(true);
    setError("");
    setQuestion("");

    try {
      const { error: userSaveError } = await supabase
        .from("task_ai_messages")
        .insert([
          {
            task_id: task.id,
            user_id: userId,
            role: "user",
            message: trimmedQuestion,
          },
        ]);

      if (userSaveError) {
        throw new Error(userSaveError.message);
      }

      const { data: latestMessages, error: latestMessagesError } =
        await supabase
          .from("task_ai_messages")
          .select("*")
          .eq("task_id", task.id)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

      if (latestMessagesError) {
        throw new Error(latestMessagesError.message);
      }

      setMessages((latestMessages ?? []) as TaskAIMessage[]);

      const response = await fetch("/api/ai/task-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: project.name,
          taskTitle: task.title,
          taskDescription: task.description,
          acceptanceCriteria: task.acceptance_criteria ?? [],
          breakdownSummary: taskBreakdown?.summary ?? "",
          question: trimmedQuestion,
          history: (latestMessages ?? []).map((item) => ({
            role: item.role,
            message: item.message,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI answer.");
      }

      const answer = data.answer as string;

      const { error: assistantSaveError } = await supabase
        .from("task_ai_messages")
        .insert([
          {
            task_id: task.id,
            user_id: userId,
            role: "assistant",
            message: answer,
          },
        ]);

      if (assistantSaveError) {
        throw new Error(assistantSaveError.message);
      }

      const { data: refreshedMessages, error: refreshError } = await supabase
        .from("task_ai_messages")
        .select("*")
        .eq("task_id", task.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (refreshError) {
        throw new Error(refreshError.message);
      }

      setMessages((refreshedMessages ?? []) as TaskAIMessage[]);
      toast.success("AI response added.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while sending the question.";

      setError(message);
      toast.error(message);
    } finally {
      setSendingQuestion(false);
    }
  }

  async function handleClearChat() {
    if (!task || !userId) return;

    setClearingChat(true);
    setError("");

    const { error } = await supabase
      .from("task_ai_messages")
      .delete()
      .eq("task_id", task.id)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
      toast.error(error.message);
    } else {
      setMessages([]);
      setQuestion("");
      toast.success("Task chat cleared.");
    }

    setClearingChat(false);
  }

  if (loading) {
    return (
      <div className="glass-card flex min-h-[420px] items-center justify-center rounded-[32px] text-white/60">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Opening task workspace...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>

        <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-8 text-red-200">
          {error || "Task not found."}
        </div>
      </div>
    );
  }

  const statusStyles = getStatusStyles(task.status);
  const criteriaCount = task.acceptance_criteria?.length || 0;

  return (
    <div className="space-y-8">
      <Link
        href={project ? `/projects/${project.id}` : "/projects"}
        className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="gradient-border relative overflow-hidden rounded-[36px] p-6 md:p-8">
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full ${getPriorityGlow(
            task.priority
          )} blur-3xl`}
        />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-2xl shadow-black/20 backdrop-blur">
              <ClipboardCheck className="h-4 w-4" />
              Task workspace
            </div>

            <p className="text-sm text-white/45">
              {project?.name || "Project task"}
            </p>

            <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              {task.title}
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
              {task.description ||
                "No description provided yet. Use the AI breakdown or ask follow-up questions to clarify the implementation path."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium ${getPriorityStyles(
                  task.priority
                )}`}
              >
                <Target className="h-4 w-4" />
                {task.priority} Priority
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium ${statusStyles.chip}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusStyles.dot}`} />
                {task.status}
              </span>

              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/60">
                <CalendarDays className="h-4 w-4" />
                Created {formatDate(task.created_at)}
              </span>
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Current status</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {statusStyles.label}
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/10">
                <CircleDashed className="h-7 w-7 text-white/75" />
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
              <label className="mb-2 block text-sm text-white/70">
                Update task status
              </label>

              <select
                value={task.status}
                disabled={updatingStatus}
                onChange={(e) =>
                  handleStatusChange(e.target.value as TaskStatus)
                }
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-white/25"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {updatingStatus && (
                <p className="mt-2 flex items-center gap-2 text-xs text-white/40">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Updating status...
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Criteria</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {criteriaCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Documents</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {documents.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-card rounded-[32px] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <CheckCircle2 className="h-5 w-5 text-white/70" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Acceptance criteria
                </h2>
                <p className="text-sm text-white/50">
                  Clear conditions that define when this task is complete.
                </p>
              </div>
            </div>

            {task.acceptance_criteria && task.acceptance_criteria.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {task.acceptance_criteria.map((item, index) => (
                  <div
                    key={`${task.id}-criteria-${index}`}
                    className="premium-card-hover rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                      {index + 1}
                    </div>

                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-4 font-semibold text-white">
                  No criteria added
                </h3>
                <p className="mt-2 text-sm text-white/45">
                  Acceptance criteria help you know exactly when a task is done.
                </p>
              </div>
            )}
          </div>

          <div className="glass-card rounded-[32px] p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Sparkles className="h-5 w-5 text-white/70" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    AI implementation breakdown
                  </h2>
                  <p className="text-sm text-white/50">
                    Turn this task into steps, notes, and testing checks.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateBreakdown}
                disabled={loadingBreakdown}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loadingBreakdown ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Generate breakdown
                  </>
                )}
              </button>
            </div>

            {!taskBreakdown ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <WandSparkles className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-4 font-semibold text-white">
                  No AI breakdown yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45">
                  Generate an implementation plan with steps, technical notes,
                  and a testing checklist.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                    Summary
                  </div>
                  <p className="text-sm leading-7 text-white/70">
                    {taskBreakdown.summary}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Implementation steps
                    </h3>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/45">
                      {taskBreakdown.steps.length} step(s)
                    </span>
                  </div>

                  <ol className="space-y-3">
                    {taskBreakdown.steps.map((step, index) => (
                      <li
                        key={`step-${index}`}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/70"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-black">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-white">
                      Technical notes
                    </h3>

                    <ul className="space-y-3">
                      {taskBreakdown.technicalNotes.map((note, index) => (
                        <li
                          key={`note-${index}`}
                          className="flex items-start gap-3 text-sm leading-6 text-white/70"
                        >
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-200" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-white">
                      Testing checklist
                    </h3>

                    <ul className="space-y-3">
                      {taskBreakdown.testingChecklist.map((item, index) => (
                        <li
                          key={`test-${index}`}
                          className="flex items-start gap-3 text-sm leading-6 text-white/70"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[32px] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <FileText className="h-5 w-5 text-white/70" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white">
                  Project documents
                </h2>
                <p className="text-sm text-white/50">
                  Related context from this project.
                </p>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-white/35" />
                <h3 className="mt-4 font-semibold text-white">
                  No documents attached
                </h3>
                <p className="mt-2 text-sm text-white/45">
                  Upload documents on the project page to keep references close.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="premium-card-hover block rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {document.file_name}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {formatBytes(document.size_bytes)} ·{" "}
                          {formatDate(document.created_at)}
                        </p>
                      </div>

                      <ExternalLink className="h-4 w-4 shrink-0 text-white/35" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-[32px] p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Bot className="h-5 w-5 text-white/70" />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Ask AI about this task
                  </h2>
                  <p className="text-sm text-white/50">
                    Get task-specific help and clarification.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClearChat}
                disabled={clearingChat || messages.length === 0}
                className="rounded-2xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                title="Clear chat"
              >
                {clearingChat ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="max-h-[460px] space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-black/25 p-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-white/35" />
                  <h3 className="mt-4 font-semibold text-white">
                    No task chat yet
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">
                    Ask a question to start a focused AI conversation for this
                    task.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-6 bg-white text-black shadow-2xl shadow-white/5"
                        : "mr-6 border border-white/10 bg-zinc-900/85 text-white/80"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold opacity-70">
                      {message.role === "user" ? "You" : "SprintFlow AI"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/40">
                Quick prompts
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuestion(prompt)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendQuestion} className="space-y-3">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something about this task..."
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/25 focus:bg-black/40"
                />

                <button
                  type="submit"
                  disabled={sendingQuestion || !question.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {sendingQuestion ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Ask AI
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}