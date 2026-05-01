import { NextResponse } from "next/server";

type TaskBreakdown = {
  summary: string;
  steps: string[];
  technicalNotes: string[];
  testingChecklist: string[];
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

const responseJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    steps: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 8,
    },
    technicalNotes: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 6,
    },
    testingChecklist: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 6,
    },
  },
  required: ["summary", "steps", "technicalNotes", "testingChecklist"],
};

function extractTextFromGeminiResponse(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  const textPart = parts.find(
    (part) => typeof part.text === "string" && part.text.trim().length > 0
  );

  return textPart?.text?.trim() ?? "";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidBreakdown(value: unknown): value is TaskBreakdown {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.summary === "string" &&
    isStringArray(candidate.steps) &&
    isStringArray(candidate.technicalNotes) &&
    isStringArray(candidate.testingChecklist)
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
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

    const payload = body as {
      projectName?: unknown;
      title?: unknown;
      description?: unknown;
      acceptanceCriteria?: unknown;
    };

    const projectName =
      typeof payload.projectName === "string" ? payload.projectName.trim() : "";

    const rawTitle =
      typeof payload.title === "string" ? payload.title.trim() : "";

    const description =
      typeof payload.description === "string"
        ? payload.description.trim()
        : "";

    const title = rawTitle || description.slice(0, 80) || "Untitled Task";

    const acceptanceCriteria = isStringArray(payload.acceptanceCriteria)
      ? payload.acceptanceCriteria
      : [];

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
You are SprintFlow AI, an expert software planning assistant.

Generate a detailed implementation breakdown for one specific task.

Return only JSON matching the provided schema.

Rules:
- summary should explain the task clearly in 1 short paragraph.
- steps should be practical implementation steps in order.
- technicalNotes should mention architecture, security, API, state management, or data considerations when relevant.
- testingChecklist should contain realistic checks the developer can perform.
- Keep it concrete and useful for a junior developer.
`.trim();

    const userPrompt = `
Project name: ${projectName || "Unknown Project"}

Task title: ${title}

Task description: ${description || "No description provided."}

Acceptance criteria:
${
  acceptanceCriteria.length > 0
    ? acceptanceCriteria.map((item) => `- ${item}`).join("\n")
    : "- No acceptance criteria provided."
}
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
                  parts: [{ text: userPrompt }],
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

        const data: GeminiResponse = await geminiResponse.json();

        if (geminiResponse.ok) {
          const rawText = extractTextFromGeminiResponse(data);

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

          if (!isValidBreakdown(parsed)) {
            return NextResponse.json(
              { error: "Gemini returned invalid breakdown data." },
              { status: 500 }
            );
          }

          return NextResponse.json({ breakdown: parsed, modelUsed: model });
        }

        lastStatusCode = geminiResponse.status;
        lastErrorMessage = data.error?.message || "Gemini request failed.";

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
    console.error("Task details generation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating task details." },
      { status: 500 }
    );
  }
}