import { NextResponse } from "next/server";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = "To Do" | "In Progress" | "Review";

type GeneratedTask = {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  acceptanceCriteria: string[];
};

type GeminiTextPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiTextPart[];
  };
};

type GeminiErrorResponse = {
  error?: {
    message?: string;
  };
};

type GeminiSuccessResponse = {
  candidates?: GeminiCandidate[];
};

type GenerateTasksResponse = {
  tasks: GeneratedTask[];
};

const responseJsonSchema = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: {
            type: "string",
            enum: ["High", "Medium", "Low"],
          },
          status: {
            type: "string",
            enum: ["To Do", "In Progress", "Review"],
          },
          acceptanceCriteria: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: [
          "title",
          "description",
          "priority",
          "status",
          "acceptanceCriteria",
        ],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["tasks"],
};

function extractTextFromGeminiResponse(data: GeminiSuccessResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  const textPart = parts.find(
    (part) => typeof part.text === "string" && part.text.trim().length > 0
  );

  return textPart?.text?.trim() ?? "";
}

function isPriority(value: unknown): value is Priority {
  return value === "High" || value === "Medium" || value === "Low";
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "To Do" || value === "In Progress" || value === "Review";
}

function isValidTask(task: unknown): task is GeneratedTask {
  if (typeof task !== "object" || task === null) {
    return false;
  }

  const candidate = task as Record<string, unknown>;

  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    isPriority(candidate.priority) &&
    isTaskStatus(candidate.status) &&
    Array.isArray(candidate.acceptanceCriteria) &&
    candidate.acceptanceCriteria.length === 3 &&
    candidate.acceptanceCriteria.every(
      (item: unknown) => typeof item === "string"
    )
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function getGeminiErrorMessage(
  data: GeminiSuccessResponse | GeminiErrorResponse
) {
  if ("error" in data) {
    return data.error?.message || "Gemini request failed.";
  }

  return "Gemini request failed.";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const promptValue = (body as { prompt?: unknown }).prompt;
    const prompt = typeof promptValue === "string" ? promptValue.trim() : "";

    if (!prompt || prompt.length < 10) {
      return NextResponse.json(
        { error: "Prompt must be at least 10 characters long." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const primaryModel = process.env.GEMINI_MODEL;
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    if (!primaryModel) {
      return NextResponse.json(
        { error: "Missing GEMINI_MODEL in .env.local" },
        { status: 500 }
      );
    }

    const models = [primaryModel, fallbackModel].filter(
      (value): value is string => Boolean(value && value.trim())
    );

    const systemInstruction = `
You are SprintFlow AI, an expert product planning assistant.

Generate exactly 5 sprint-ready tasks for the user's feature idea.

Rules:
- Keep titles short and practical.
- Make descriptions clear and implementation-focused.
- acceptanceCriteria must contain exactly 3 items.
- Use realistic software product tasks.
- Return only JSON that matches the provided schema.
`.trim();

    let lastErrorMessage = "Gemini request failed.";
    let lastStatusCode = 500;

    for (const model of models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Feature idea: ${prompt}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseJsonSchema,
                temperature: 0.4,
              },
            }),
          }
        );

        const data: GeminiSuccessResponse | GeminiErrorResponse =
          await geminiResponse.json();

        if (geminiResponse.ok) {
          const rawText = extractTextFromGeminiResponse(
            data as GeminiSuccessResponse
          );

          if (!rawText) {
            lastErrorMessage = "No text was returned from Gemini.";
            lastStatusCode = 500;
            break;
          }

          let parsed: unknown;

          try {
            parsed = JSON.parse(rawText);
          } catch {
            return NextResponse.json(
              { error: "Gemini returned invalid JSON." },
              { status: 500 }
            );
          }

          if (typeof parsed !== "object" || parsed === null) {
            return NextResponse.json(
              { error: "Gemini returned invalid task data." },
              { status: 500 }
            );
          }

          const tasks = (parsed as Partial<GenerateTasksResponse>).tasks;

          if (!Array.isArray(tasks) || tasks.length !== 5) {
            return NextResponse.json(
              { error: "Gemini returned invalid task data." },
              { status: 500 }
            );
          }

          if (!tasks.every((task) => isValidTask(task))) {
            return NextResponse.json(
              { error: "Gemini returned tasks in an unexpected format." },
              { status: 500 }
            );
          }

          return NextResponse.json({ tasks, modelUsed: model });
        }

        lastStatusCode = geminiResponse.status;
        lastErrorMessage = getGeminiErrorMessage(data);

        const shouldRetry = isRetryableStatus(geminiResponse.status);

        if (!shouldRetry || attempt === 3) {
          break;
        }

        await sleep(attempt * 1500);
      }
    }

    const friendlyMessage =
      lastStatusCode === 429 ||
      lastErrorMessage.toLowerCase().includes("high demand")
        ? "Gemini is busy right now. Please try again in a few seconds."
        : lastErrorMessage;

    return NextResponse.json(
      { error: friendlyMessage },
      { status: lastStatusCode === 429 ? 503 : lastStatusCode || 500 }
    );
  } catch (error) {
    console.error("Gemini task generation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating tasks." },
      { status: 500 }
    );
  }
}