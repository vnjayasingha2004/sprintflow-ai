"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
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

type ProjectDocument = {
  id: string;
  project_id: string;
  user_id: string | null;
  file_name: string;
  file_path: string;
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const columnOrder: TaskStatus[] = ["To Do", "In Progress", "Review", "Done"];

function getPriorityStyles(priority: TaskPriority) {
  if (priority === "High") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  if (priority === "Medium") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-white/65";
}

function getPriorityStripe(priority: TaskPriority) {
  if (priority === "High") return "bg-red-300";
  if (priority === "Medium") return "bg-amber-300";
  return "bg-white/35";
}

function getStatusColumnStyles(status: TaskStatus) {
  if (status === "Done") {
    return {
      dot: "bg-emerald-300",
      glow: "from-emerald-400/15 to-transparent",
      label: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    };
  }

  if (status === "In Progress") {
    return {
      dot: "bg-blue-300",
      glow: "from-blue-400/15 to-transparent",
      label: "border-blue-400/20 bg-blue-400/10 text-blue-100",
    };
  }

  if (status === "Review") {
    return {
      dot: "bg-amber-300",
      glow: "from-amber-400/15 to-transparent",
      label: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    };
  }

  return {
    dot: "bg-white/45",
    glow: "from-white/10 to-transparent",
    label: "border-white/10 bg-white/5 text-white/70",
  };
}

function getDocumentIcon(fileName: string) {
  const lower = fileName.toLowerCase();

  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp")
  ) {
    return ImageIcon;
  }

  return FileText;
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

export default function ProjectDetailsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ id: string }>();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editedProjectName, setEditedProjectName] = useState("");
  const [editedProjectDescription, setEditedProjectDescription] = useState("");
  const [updatingProject, setUpdatingProject] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<TaskPriority>("Medium");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("To Do");
  const [newTaskCriteria, setNewTaskCriteria] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const [updatingTaskId, setUpdatingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");

  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState("");

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    async function loadProjectDetails() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(`/sign-in?next=/projects/${projectId}`);
        return;
      }

      setUserId(user.id);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (projectError) {
        setError(projectError.message);
        toast.error(projectError.message);
        setLoading(false);
        return;
      }

      if (!projectData) {
        const message = "Project not found or you do not have access to it.";
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      const loadedProject = projectData as Project;

      setProject(loadedProject);
      setEditedProjectName(loadedProject.name);
      setEditedProjectDescription(loadedProject.description || "");

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (taskError) {
        setError(taskError.message);
        toast.error(taskError.message);
        setLoading(false);
        return;
      }

      setTasks((taskData ?? []) as Task[]);

      const { data: documentsData, error: documentsError } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (documentsError) {
        setError(documentsError.message);
        toast.error(documentsError.message);
        setLoading(false);
        return;
      }

      setProjectDocuments((documentsData ?? []) as ProjectDocument[]);
      setLoading(false);
    }

    void loadProjectDetails();
  }, [projectId, router, supabase]);

  async function handleUpdateProject() {
    if (!project || !userId) return;

    if (!editedProjectName.trim()) {
      setError("Project name is required.");
      toast.error("Project name is required.");
      return;
    }

    setUpdatingProject(true);
    setError("");

    const { data, error } = await supabase
      .from("projects")
      .update({
        name: editedProjectName.trim(),
        description: editedProjectDescription.trim() || null,
      })
      .eq("id", project.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setUpdatingProject(false);
      return;
    }

    const updatedProject = data as Project;

    setProject(updatedProject);
    setEditedProjectName(updatedProject.name);
    setEditedProjectDescription(updatedProject.description || "");
    setIsEditingProject(false);
    setUpdatingProject(false);
    toast.success("Project updated successfully.");
  }

  async function handleCreateTask() {
    if (!projectId || !userId) return;

    if (!newTaskTitle.trim()) {
      setError("Task title is required.");
      toast.error("Task title is required.");
      return;
    }

    setCreatingTask(true);
    setError("");

    const acceptanceCriteria = newTaskCriteria
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          priority: newTaskPriority,
          status: newTaskStatus,
          acceptance_criteria: acceptanceCriteria,
        },
      ])
      .select()
      .single();

    if (error) {
      setError(error.message);
      toast.error(error.message);
      setCreatingTask(false);
      return;
    }

    setTasks((prev) => [...prev, data as Task]);

    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("Medium");
    setNewTaskStatus("To Do");
    setNewTaskCriteria("");
    setCreatingTask(false);
    toast.success("Task created successfully.");
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (!projectId || !userId) return;

    setUpdatingTaskId(taskId);
    setError("");

    const previousTasks = tasks;

    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );

    setTasks(updatedTasks);

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      setTasks(previousTasks);
      setError(error.message);
      toast.error(error.message);
    } else {
      toast.success("Task status updated.");
    }

    setUpdatingTaskId("");
  }

  async function handleDeleteTask(taskId: string) {
    if (!projectId || !userId) return;

    setDeletingTaskId(taskId);
    setError("");

    const previousTasks = tasks;
    const updatedTasks = tasks.filter((task) => task.id !== taskId);

    setTasks(updatedTasks);

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (error) {
      setTasks(previousTasks);
      setError(error.message);
      toast.error(error.message);
    } else {
      toast.success("Task deleted.");
    }

    setDeletingTaskId("");
  }

  async function handleProjectDocumentUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    if (!projectId || !userId) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingDocument(true);
    setError("");

    try {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${userId}/${projectId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { data: insertedRow, error: insertError } = await supabase
        .from("project_documents")
        .insert([
          {
            project_id: projectId,
            user_id: userId,
            file_name: file.name,
            file_path: filePath,
            public_url: publicUrl,
            mime_type: file.type || null,
            size_bytes: file.size,
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setProjectDocuments((prev) => [insertedRow as ProjectDocument, ...prev]);
      toast.success("Document uploaded successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading the document.";

      setError(message);
      toast.error(message);
    } finally {
      setUploadingDocument(false);
      event.target.value = "";
    }
  }

  async function handleDeleteProjectDocument(document: ProjectDocument) {
    if (!projectId || !userId) return;

    setDeletingDocumentId(document.id);
    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([document.file_path]);

      if (storageError) {
        throw new Error(storageError.message);
      }

      const { error: deleteRowError } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", document.id)
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (deleteRowError) {
        throw new Error(deleteRowError.message);
      }

      setProjectDocuments((prev) =>
        prev.filter((item) => item.id !== document.id)
      );

      toast.success("Document deleted.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the document.";

      setError(message);
      toast.error(message);
    } finally {
      setDeletingDocumentId("");
    }
  }

  async function handleDeleteProject() {
    if (!project || !projectId || !userId) return;

    if (deleteConfirmation.trim() !== project.name) {
      toast.error("Type the exact project name to confirm deletion.");
      return;
    }

    setDeletingProject(true);
    setError("");

    try {
      const documentPaths = projectDocuments.map(
        (document) => document.file_path
      );

      if (documentPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("project-documents")
          .remove(documentPaths);

        if (storageError) {
          throw new Error(storageError.message);
        }
      }

      const taskIds = tasks.map((task) => task.id);

      if (taskIds.length > 0) {
        const { error: messagesError } = await supabase
          .from("task_ai_messages")
          .delete()
          .eq("user_id", userId)
          .in("task_id", taskIds);

        if (messagesError) {
          throw new Error(messagesError.message);
        }

        const { error: detailsError } = await supabase
          .from("task_ai_details")
          .delete()
          .eq("user_id", userId)
          .in("task_id", taskIds);

        if (detailsError) {
          throw new Error(detailsError.message);
        }

        const { error: tasksError } = await supabase
          .from("tasks")
          .delete()
          .eq("project_id", projectId)
          .eq("user_id", userId);

        if (tasksError) {
          throw new Error(tasksError.message);
        }
      }

      const { error: documentsError } = await supabase
        .from("project_documents")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (documentsError) {
        throw new Error(documentsError.message);
      }

      const { error: projectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", userId);

      if (projectError) {
        throw new Error(projectError.message);
      }

      toast.success("Project deleted successfully.");
      router.replace("/projects");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the project.";

      setError(message);
      toast.error(message);
      setDeletingProject(false);
    }
  }

  const groupedTasks = columnOrder.reduce<Record<TaskStatus, Task[]>>(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    },
    {
      "To Do": [],
      "In Progress": [],
      Review: [],
      Done: [],
    }
  );

  const doneTasks = tasks.filter((task) => task.status === "Done").length;
  const activeTasks = tasks.filter(
    (task) => task.status === "In Progress" || task.status === "Review"
  ).length;
  const progress =
    tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="glass-card flex min-h-[420px] items-center justify-center rounded-[32px] text-white/60">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Opening project workspace...
      </div>
    );
  }

  if (!project) {
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
          {error || "Project not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="gradient-border relative overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-start">
          <div>
            {isEditingProject ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70">
                  <Pencil className="h-4 w-4" />
                  Editing project
                </div>

                <input
                  value={editedProjectName}
                  onChange={(e) => setEditedProjectName(e.target.value)}
                  className="w-full rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-3xl font-semibold text-white outline-none placeholder:text-white/30 focus:border-white/25 md:text-5xl"
                />

                <textarea
                  value={editedProjectDescription}
                  onChange={(e) =>
                    setEditedProjectDescription(e.target.value)
                  }
                  placeholder="Add a useful project description..."
                  className="min-h-[140px] w-full resize-none rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-white/25"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleUpdateProject}
                    disabled={updatingProject}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {updatingProject ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {updatingProject ? "Saving..." : "Save changes"}
                  </button>

                  <button
                    onClick={() => {
                      setIsEditingProject(false);
                      setEditedProjectName(project.name);
                      setEditedProjectDescription(project.description || "");
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-2xl shadow-black/20 backdrop-blur">
                  <FolderKanban className="h-4 w-4" />
                  Project workspace
                </div>

                <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  {project.name}
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                  {project.description ||
                    "No project description added yet. Add one to make the workspace easier to understand later."}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsEditingProject(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit project
                  </button>

                  <Link
                    href={`/ai-planner?projectId=${project.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Generate task plan
                  </Link>

                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm text-white/60">
                    <CalendarDays className="h-4 w-4" />
                    Created {formatDate(project.created_at)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Project progress</p>
                <p className="mt-1 text-4xl font-semibold text-white">
                  {progress}%
                </p>
              </div>

              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(white ${progress}%, rgba(255,255,255,0.12) 0)`,
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
                  {doneTasks}/{tasks.length || 0}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {tasks.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Active</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {activeTasks}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs text-white/45">Done</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {doneTasks}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm text-white/75">
                <Target className="h-4 w-4 text-blue-200" />
                Next best action
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {tasks.length === 0
                  ? "Create a task or generate a task plan to start moving."
                  : activeTasks > 0
                    ? "Keep active tasks moving toward review or done."
                    : "Pick a task from To Do and start the next sprint step."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-[32px] p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
              <FileText className="h-3.5 w-3.5" />
              Project context
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Documents and references
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Upload briefs, requirements, screenshots, or notes that support
              this project.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02]">
            {uploadingDocument ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploadingDocument ? "Uploading..." : "Upload document"}
            <input
              type="file"
              onChange={handleProjectDocumentUpload}
              disabled={uploadingDocument}
              className="hidden"
            />
          </label>
        </div>

        {projectDocuments.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
              <FileText className="h-7 w-7 text-white/60" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">
              No documents yet
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/50">
              Add files that explain the project. Later, AI Planner can use
              saved documents to generate better tasks.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectDocuments.map((document) => {
              const DocumentIcon = getDocumentIcon(document.file_name);

              return (
                <div
                  key={document.id}
                  className="premium-card-hover group rounded-3xl border border-white/10 bg-black/25 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <DocumentIcon className="h-5 w-5 text-white/75" />
                    </div>

                    <button
                      onClick={() => handleDeleteProjectDocument(document)}
                      disabled={deletingDocumentId === document.id}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      title="Delete document"
                    >
                      {deletingDocumentId === document.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <a
                    href={document.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 flex items-center gap-2 truncate font-semibold text-white underline-offset-4 hover:underline"
                  >
                    <span className="truncate">{document.file_name}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-white/35" />
                  </a>

                  <p className="mt-2 text-xs text-white/40">
                    {formatBytes(document.size_bytes)} ·{" "}
                    {formatDate(document.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.45fr]">
        <div className="glass-card relative overflow-hidden rounded-[32px] p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/60">
              <Plus className="h-4 w-4" />
              Manual task
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Add a focused task
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Create a task by hand when you already know the next action.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Task title
                </label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Example: Polish mobile sidebar"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/30 focus:bg-black/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="What should be done?"
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/30 focus:bg-black/40"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as TaskPriority)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/30"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) =>
                      setNewTaskStatus(e.target.value as TaskStatus)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/30"
                  >
                    {columnOrder.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Acceptance criteria
                </label>
                <textarea
                  value={newTaskCriteria}
                  onChange={(e) => setNewTaskCriteria(e.target.value)}
                  placeholder="One completion condition per line"
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30 transition focus:border-white/30 focus:bg-black/40"
                />
              </div>

              <button
                onClick={handleCreateTask}
                disabled={creatingTask}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.01] hover:bg-white/90 disabled:opacity-60"
              >
                {creatingTask ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {creatingTask ? "Creating task..." : "Create task"}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[32px] p-6">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                <Layers3 className="h-3.5 w-3.5" />
                Kanban board
              </div>

              <h2 className="text-2xl font-semibold text-white">
                Task workflow
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Move tasks through the project from idea to done.
              </p>
            </div>

            <Link
              href={`/ai-planner?projectId=${project.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <WandSparkles className="h-4 w-4" />
              AI Planner
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/15 bg-black/20 p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
                <FolderKanban className="h-7 w-7 text-white/60" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white">
                No tasks yet
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/50">
                Create a manual task or use AI Planner to build a task plan for
                this project.
              </p>

              <Link
                href={`/ai-planner?projectId=${project.id}`}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <WandSparkles className="h-4 w-4" />
                Generate tasks
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-4">
              {columnOrder.map((status) => {
                const styles = getStatusColumnStyles(status);

                return (
                  <div
                    key={status}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-4"
                  >
                    <div
                      className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${styles.glow}`}
                    />

                    <div className="relative mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                        />
                        <h3 className="font-semibold text-white">{status}</h3>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                        {groupedTasks[status].length}
                      </span>
                    </div>

                    <div className="relative space-y-3">
                      {groupedTasks[status].length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-white/35">
                          Drop-off zone is empty
                        </div>
                      ) : (
                        groupedTasks[status].map((task) => (
                          <div
                            key={task.id}
                            className="premium-card-hover group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]"
                          >
                            <div
                              className={`h-1.5 w-full ${getPriorityStripe(
                                task.priority
                              )}`}
                            />

                            <div className="p-4">
                              <button
                                onClick={() => router.push(`/tasks/${task.id}`)}
                                className="block w-full text-left"
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <h4 className="line-clamp-2 font-semibold text-white">
                                    {task.title}
                                  </h4>

                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${getPriorityStyles(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>

                                <p className="line-clamp-3 text-sm leading-6 text-white/55">
                                  {task.description ||
                                    "No description provided."}
                                </p>

                                <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                                  <span className="inline-flex items-center gap-1.5">
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    {task.acceptance_criteria?.length || 0}{" "}
                                    criteria
                                  </span>

                                  <span>Open details</span>
                                </div>
                              </button>

                              <div className="mt-4 space-y-3">
                                <select
                                  value={task.status}
                                  disabled={updatingTaskId === task.id}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      task.id,
                                      e.target.value as TaskStatus
                                    )
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white outline-none"
                                >
                                  {columnOrder.map((item) => (
                                    <option key={item} value={item}>
                                      {item}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={deletingTaskId === task.id}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                                >
                                  {deletingTaskId === task.id ? (
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  {deletingTaskId === task.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-200">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-red-100">
                Danger zone
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/70">
                Deleting this project removes the project, tasks, task AI
                messages, task AI details, and uploaded document records. This
                action cannot be undone.
              </p>

              <p className="mt-4 text-sm text-red-100/70">
                Type{" "}
                <span className="font-semibold text-red-100">
                  {project.name}
                </span>{" "}
                to confirm deletion.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-[360px]">
            <input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={project.name}
              className="w-full rounded-2xl border border-red-500/20 bg-black/30 px-4 py-3 text-red-100 outline-none placeholder:text-red-100/30 focus:border-red-300/40"
            />

            <button
              onClick={handleDeleteProject}
              disabled={
                deletingProject || deleteConfirmation.trim() !== project.name
              }
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingProject ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deletingProject ? "Deleting project..." : "Delete project"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}