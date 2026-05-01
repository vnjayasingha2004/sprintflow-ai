"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  LoaderCircle,
  WandSparkles,
  CheckCircle2,
  Flag,
  ListTodo,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
  FolderKanban,
  Target,
  Save,
  RefreshCcw,
  Layers3,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type GeneratedTask = {
  id: number;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "To Do" | "In Progress" | "Review";
  acceptanceCriteria: string[];
};

type ProjectOption = {
  id: string;
  name: string;
};

type SavedProjectDocument = {
  id: string;
  project_id: string;
  user_id: string | null;
  file_name: string;
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
};

const examplePrompts = [
  "Build a fitness app dashboard with login, profile editing, and weekly progress charts.",
  "Create an e-commerce admin panel with product management, order tracking, and coupon support.",
  "Design a team chat feature with channels, notifications, file sharing, and unread message counts.",
];

const supportedFileTypes = [
  ".pdf",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

function getInitialQueryValue(key: string) {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? "";
}

function getPriorityStyles(priority: GeneratedTask["priority"]) {
  if (priority === "High") {
    return "border-red-400/25 bg-red-400/10 text-red-100";
  }

  if (priority === "Medium") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getPriorityStripe(priority: GeneratedTask["priority"]) {
  if (priority === "High") return "bg-red-300";
  if (priority === "Medium") return "bg-amber-300";
  return "bg-white/35";
}

function normalizeTasks(
  tasks: Omit<GeneratedTask, "id">[] | GeneratedTask[]
): GeneratedTask[] {
  return tasks.map((task, index) => ({
    ...task,
    id: index + 1,
  }));
}

function getFileIcon(fileName: string) {
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

export default function AiPlannerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    getInitialQueryValue("projectId")
  );
  const [savingTasks, setSavingTasks] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSavedDocument, setSelectedSavedDocument] =
    useState<SavedProjectDocument | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(() =>
    getInitialQueryValue("documentId")
  );
  const [lastGenerationMode, setLastGenerationMode] = useState<
    "prompt" | "file" | "savedDocument" | null
  >(null);

  const canGenerateFromPrompt = useMemo(
    () => prompt.trim().length > 10,
    [prompt]
  );

  const canGenerateFromFile = Boolean(selectedFile);
  const canGenerateFromSavedDocument = Boolean(selectedSavedDocument);

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  );

  useEffect(() => {
    let cancelled = false;

    async function loadUserAndProjects() {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace(`/sign-in?next=${pathname}`);
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }

      const loadedProjects = (data ?? []) as ProjectOption[];
      setProjects(loadedProjects);

      if (
        selectedProjectId &&
        !loadedProjects.some((project) => project.id === selectedProjectId)
      ) {
        setSelectedProjectId("");
      }
    }

    void loadUserAndProjects();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, selectedProjectId, supabase]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadSavedDocument() {
      if (!selectedDocumentId) {
        setSelectedSavedDocument(null);
        return;
      }

      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("id", selectedDocumentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }

      if (!data) {
        const message =
          "Saved document not found or you do not have access to it.";
        setError(message);
        setSelectedSavedDocument(null);
        toast.error(message);
        return;
      }

      const document = data as SavedProjectDocument;

      setSelectedSavedDocument(document);
      setSelectedFile(null);
      setPrompt("");
      setSelectedProjectId(document.project_id);
      toast.success("Saved document loaded.");
    }

    void loadSavedDocument();

    return () => {
      cancelled = true;
    };
  }, [selectedDocumentId, userId, supabase]);

  function resetMessages() {
    setError("");
    setSaveMessage("");
  }

  function updateUrlAfterClearingSavedDocument() {
    const params = new URLSearchParams(window.location.search);
    params.delete("documentId");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function clearSavedDocumentSelection() {
    setSelectedSavedDocument(null);
    setSelectedDocumentId("");
    updateUrlAfterClearingSavedDocument();
  }

  function handleExampleClick(value: string) {
    clearSavedDocumentSelection();
    setSelectedFile(null);
    setPrompt(value);
    resetMessages();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    resetMessages();

    if (file) {
      clearSavedDocumentSelection();
      setPrompt("");
      toast.info("File selected. Click Generate from File.");
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    resetMessages();
    toast.info("File removed.");
  }

  async function handleGenerate() {
    if (!canGenerateFromPrompt) {
      toast.error("Enter a longer feature idea first.");
      return;
    }

    setIsGenerating(true);
    setLastGenerationMode("prompt");
    setGeneratedTasks([]);
    resetMessages();

    try {
      const response = await fetch("/api/ai/generate-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate tasks.");
      }

      const tasks = normalizeTasks(data.tasks);
      setGeneratedTasks(tasks);
      toast.success(`${tasks.length} task(s) generated.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating tasks.";

      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateFromFile() {
    if (!selectedFile) {
      toast.error("Choose a file first.");
      return;
    }

    setIsGenerating(true);
    setLastGenerationMode("file");
    setGeneratedTasks([]);
    resetMessages();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/ai/generate-tasks-from-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate tasks from file.");
      }

      const tasks = normalizeTasks(data.tasks);
      setGeneratedTasks(tasks);
      toast.success(`${tasks.length} task(s) generated from file.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating tasks from the uploaded file.";

      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateFromSavedDocument() {
    if (!selectedSavedDocument) {
      toast.error("Choose a saved project document first.");
      return;
    }

    setIsGenerating(true);
    setLastGenerationMode("savedDocument");
    setGeneratedTasks([]);
    resetMessages();

    try {
      const response = await fetch(
        "/api/ai/generate-tasks-from-saved-document",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicUrl: selectedSavedDocument.public_url,
            fileName: selectedSavedDocument.file_name,
            mimeType: selectedSavedDocument.mime_type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate tasks from saved document."
        );
      }

      const tasks = normalizeTasks(data.tasks);
      setGeneratedTasks(tasks);
      toast.success(`${tasks.length} task(s) generated from saved document.`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating tasks from the saved document.";

      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRetryGeneration() {
    if (lastGenerationMode === "savedDocument" && selectedSavedDocument) {
      await handleGenerateFromSavedDocument();
      return;
    }

    if (lastGenerationMode === "file" && selectedFile) {
      await handleGenerateFromFile();
      return;
    }

    if (lastGenerationMode === "prompt" && canGenerateFromPrompt) {
      await handleGenerate();
      return;
    }

    toast.error("Nothing to retry yet.");
  }

  async function handleSaveTasks() {
    if (!userId) {
      router.replace(`/sign-in?next=${pathname}`);
      return;
    }

    if (!selectedProjectId) {
      const message = "Please select a project first.";
      setSaveMessage(message);
      toast.error(message);
      return;
    }

    if (!projects.some((project) => project.id === selectedProjectId)) {
      const message = "You do not have access to the selected project.";
      setSaveMessage(message);
      toast.error(message);
      return;
    }

    if (generatedTasks.length === 0) {
      const message = "Generate tasks before saving.";
      setSaveMessage(message);
      toast.error(message);
      return;
    }

    setSavingTasks(true);
    setSaveMessage("");
    setError("");

    const tasksToInsert = generatedTasks.map((task) => ({
      project_id: selectedProjectId,
      user_id: userId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      acceptance_criteria: task.acceptanceCriteria,
    }));

    const { error } = await supabase.from("tasks").insert(tasksToInsert);

    if (error) {
      setSaveMessage(error.message);
      toast.error(error.message);
      setSavingTasks(false);
      return;
    }

    const message = "Tasks saved successfully.";
    setSaveMessage(message);
    toast.success(message);
    setSavingTasks(false);
  }

  return (
    <div className="space-y-8">
      <section className="gradient-border relative overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/75 shadow-2xl shadow-black/20 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              AI planning studio
            </div>

            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Turn messy ideas into clean, sprint-ready task plans.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
              Start from a prompt, upload a requirement file, or reuse saved
              project documents. SprintFlow AI will produce tasks with
              priorities, statuses, and acceptance criteria.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#planner-input"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-white/10 transition hover:scale-[1.02]"
              >
                <WandSparkles className="h-4 w-4" />
                Build task plan
              </a>

              <a
                href="#generated-output"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Layers3 className="h-4 w-4" />
                View output
              </a>
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">Generated tasks</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-white">
                  {generatedTasks.length}
                </p>
              </div>

              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/10">
                <ListTodo className="h-9 w-9 text-white/75" />
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
              <p className="text-sm text-white/50">Selected project</p>
              <p className="mt-2 line-clamp-1 font-semibold text-white">
                {selectedProject?.name || "No project selected"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                Tasks can only be saved after selecting a project.
              </p>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-sm text-white/75">
                <Lightbulb className="h-4 w-4 text-amber-200" />
                Best workflow
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Create a project first, generate a task plan here, then save
                everything into that project board.
              </p>
            </div>
          </div>
        </div>
      </section>

      <motion.section
        id="planner-input"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]"
      >
        <div className="glass-card relative overflow-hidden rounded-[32px] p-6 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/60">
              <Target className="h-4 w-4" />
              Planning input
            </div>

            <h2 className="text-2xl font-semibold text-white">
              Choose how you want to generate tasks
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Use a short idea for quick planning, or provide a file/document for
              more context-aware task generation.
            </p>

            {selectedSavedDocument && (
              <div className="mt-6 rounded-3xl border border-blue-400/20 bg-blue-400/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const FileIcon = getFileIcon(
                        selectedSavedDocument.file_name
                      );

                      return (
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                          <FileIcon className="h-5 w-5 text-blue-100" />
                        </div>
                      );
                    })()}

                    <div>
                      <p className="text-sm font-semibold text-white">
                        {selectedSavedDocument.file_name}
                      </p>
                      <p className="mt-1 text-xs text-blue-100/60">
                        Saved project document is ready for AI generation
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearSavedDocumentSelection}
                    className="rounded-full border border-white/10 bg-white/10 p-2 text-white/70 transition hover:bg-white/15 hover:text-white"
                    title="Remove saved document"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-white/80">
                Describe the feature or goal
              </label>

              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Build a project management dashboard with login, team roles, task tracking, and progress analytics."
                className="min-h-[190px] resize-none rounded-3xl border-white/10 bg-black/30 text-white placeholder:text-white/30 transition focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={
                  Boolean(selectedFile) || Boolean(selectedSavedDocument)
                }
              />

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
                <span>
                  {selectedFile || selectedSavedDocument
                    ? "Prompt is disabled while document generation is selected."
                    : "Use at least 10 characters for prompt generation."}
                </span>
                <span>{prompt.trim().length} characters</span>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
                <Paperclip className="h-4 w-4" />
                Upload project file
              </div>

              {!selectedFile ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-9 text-center transition hover:bg-white/[0.06]">
                  <Upload className="mb-3 h-7 w-7 text-white/70" />
                  <span className="text-sm font-semibold text-white">
                    Choose a file to analyze
                  </span>
                  <span className="mt-2 text-xs text-white/45">
                    Supported: {supportedFileTypes.join(", ")}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {(() => {
                        const FileIcon = getFileIcon(selectedFile.name);

                        return (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <FileIcon className="h-5 w-5 text-white/80" />
                          </div>
                        );
                      })()}

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-white/45">
                    Remove this file to switch back to prompt-based generation.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
                <FolderKanban className="h-4 w-4" />
                Save generated tasks into project
              </label>

              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-white/25"
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {projects.length === 0 && (
                <p className="mt-2 text-xs text-white/40">
                  No projects found. Create a project first, then return here.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={handleGenerate}
                disabled={
                  !canGenerateFromPrompt ||
                  isGenerating ||
                  !!selectedFile ||
                  !!selectedSavedDocument
                }
                className="rounded-2xl bg-white px-5 py-6 text-black shadow-2xl shadow-white/10 hover:bg-white/90"
              >
                {isGenerating && lastGenerationMode === "prompt" ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <WandSparkles className="mr-2 h-4 w-4" />
                    Generate from prompt
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateFromFile}
                disabled={
                  !canGenerateFromFile ||
                  isGenerating ||
                  !!selectedSavedDocument
                }
                className="rounded-2xl bg-white/10 px-5 py-6 text-white hover:bg-white/20"
              >
                {isGenerating && lastGenerationMode === "file" ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Reading file...
                  </>
                ) : (
                  <>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Generate from file
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateFromSavedDocument}
                disabled={!canGenerateFromSavedDocument || isGenerating}
                className="rounded-2xl bg-white/10 px-5 py-6 text-white hover:bg-white/20"
              >
                {isGenerating && lastGenerationMode === "savedDocument" ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Reading saved doc...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate from saved doc
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setPrompt("");
                  setSelectedFile(null);
                  clearSavedDocumentSelection();
                  setGeneratedTasks([]);
                  setError("");
                  setSaveMessage("");
                  setLastGenerationMode(null);
                  toast.info("AI Planner cleared.");
                }}
                className="rounded-2xl border-white/10 bg-white/5 px-5 py-6 text-white hover:bg-white/10 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>

              <Button
                onClick={handleRetryGeneration}
                disabled={
                  isGenerating ||
                  (!canGenerateFromPrompt &&
                    !canGenerateFromFile &&
                    !canGenerateFromSavedDocument)
                }
                className="rounded-2xl bg-white/5 px-5 py-6 text-white hover:bg-white/10"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {saveMessage && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card-soft rounded-[32px] p-6">
            <p className="text-sm text-white/50">Quick examples</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Try one of these prompts
            </h2>

            <div className="mt-5 space-y-3">
              {examplePrompts.map((example, index) => (
                <motion.button
                  key={example}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.08 }}
                  onClick={() => handleExampleClick(example)}
                  className="premium-card-hover w-full rounded-3xl border border-white/10 bg-black/25 p-4 text-left"
                  disabled={
                    Boolean(selectedFile) || Boolean(selectedSavedDocument)
                  }
                >
                  <p className="text-sm leading-6 text-white/70">{example}</p>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-6">
            <p className="text-sm text-white/50">What SprintFlow will create</p>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                <ListTodo className="h-4 w-4 text-blue-200" />
                Structured task breakdown
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                <Flag className="h-4 w-4 text-amber-200" />
                Priority suggestions
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                Acceptance criteria
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                <FileText className="h-4 w-4 text-violet-200" />
                Requirement extraction from docs
              </div>
            </div>
          </div>

          <div className="glass-card-soft rounded-[32px] p-6">
            <p className="text-sm text-white/50">Supported uploads</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {supportedFileTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <section id="generated-output" className="space-y-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-white/50">Generated output</p>
            <h2 className="text-3xl font-semibold text-white">
              AI task suggestions
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Review the generated tasks, then save them into your selected
              project.
            </p>
          </div>

          <Button
            onClick={handleSaveTasks}
            disabled={savingTasks || generatedTasks.length === 0}
            className="rounded-2xl bg-white px-5 py-6 text-black shadow-2xl shadow-white/10 hover:bg-white/90 disabled:opacity-60"
          >
            {savingTasks ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save to selected project
              </>
            )}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="glass-card-soft rounded-[28px] p-5"
                >
                  <div className="mb-4 h-5 w-32 rounded-full bg-white/10" />
                  <div className="mb-3 h-4 w-full rounded-full bg-white/10" />
                  <div className="mb-3 h-4 w-5/6 rounded-full bg-white/10" />
                  <div className="mb-3 h-4 w-3/4 rounded-full bg-white/10" />
                  <div className="mt-6 h-8 w-20 rounded-full bg-white/10" />
                </div>
              ))}
            </motion.div>
          ) : generatedTasks.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {generatedTasks.map((task, index) => (
                <motion.div
                  key={`${task.id}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
                  whileHover={{ y: -5 }}
                  className="premium-card-hover group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045]"
                >
                  <div
                    className={`h-1.5 w-full ${getPriorityStripe(
                      task.priority
                    )}`}
                  />

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Badge
                        className={`border ${getPriorityStyles(task.priority)}`}
                      >
                        {task.priority}
                      </Badge>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        {task.status}
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-white">
                      {task.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {task.description}
                    </p>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                          Acceptance criteria
                        </p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/45">
                          {task.acceptanceCriteria.length}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {task.acceptanceCriteria.map((item, itemIndex) => (
                          <li
                            key={`${task.id}-${itemIndex}`}
                            className="flex items-start gap-2 text-sm leading-6 text-white/70"
                          >
                            <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-200" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-[32px] p-10 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
                <Sparkles className="h-7 w-7 text-white/70" />
              </div>

              <h3 className="mt-5 text-xl font-semibold text-white">
                No tasks generated yet
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">
                Enter a feature idea, upload a project file, or use a saved
                project document to generate your first AI task plan.
              </p>

              <a
                href="#planner-input"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <WandSparkles className="h-4 w-4" />
                Start generating
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}