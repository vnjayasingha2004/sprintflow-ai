import { NextResponse } from "next/server";
import mammoth from "mammoth";

type Priority = "High" | "Medium" | "Low";
type TaskStatus = "To Do" | "In Progress" | "Review";

type GeneratedTask = {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  acceptanceCriteria: string[];
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

type GenerateTasksResponse = {
  tasks: GeneratedTask[];
};

const supportedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

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

async function extractDocxText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  });

  return result.value.trim();
}

function buildPromptForExtractedText(fileName: string, extractedText: string) {
  return `
You are SprintFlow AI, an expert product planning assistant.

The user uploaded a project file named "${fileName}".

Read the project requirements below and generate exactly 5 sprint-ready software tasks.

Rules:
- Keep titles short and practical.
- Make descriptions clear and implementation-focused.
- acceptanceCriteria must contain exactly 3 items.
- Use realistic software product tasks.
- Return only JSON matching the provided schema.

Project content:
${extractedText}
`.trim();
}

function buildPromptForPdfOrImage(fileName: string) {
  return `
You are SprintFlow AI, an expert product planning assistant.

The user uploaded a project file named "${fileName}".

Read the uploaded file carefully and generate exactly 5 sprint-ready software tasks.

Rules:
- Keep titles short and practical.
- Make descriptions clear and implementation-focused.
- acceptanceCriteria must contain exactly 3 items.
- Use realistic software product tasks.
- Return only JSON matching the provided schema.
`.trim();
}

async function callGeminiWithTextPrompt(
  prompt: string,
  apiKey: string,
  models: string[]
) {
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
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
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

        return { rawText, modelUsed: model };
      }

      lastStatusCode = geminiResponse.status;
      lastErrorMessage = data.error?.message || "Gemini request failed.";

      if (!isRetryableStatus(geminiResponse.status) || attempt === 3) {
        break;
      }

      await sleep(attempt * 1500);
    }
  }

  throw new Error(
    lastStatusCode === 429 ||
      lastErrorMessage.toLowerCase().includes("high demand")
      ? "Gemini is busy right now. Please try again in a few seconds."
      : lastErrorMessage
  );
}

async function callGeminiWithInlineFile(
  file: File,
  apiKey: string,
  models: string[]
) {
  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt = buildPromptForPdfOrImage(file.name);

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
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: file.type,
                      data: bytes,
                    },
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

      const data: GeminiResponse = await geminiResponse.json();

      if (geminiResponse.ok) {
        const rawText = extractTextFromGeminiResponse(data);

        if (!rawText) {
          lastErrorMessage = "No text was returned from Gemini.";
          lastStatusCode = 500;
          break;
        }

        return { rawText, modelUsed: model };
      }

      lastStatusCode = geminiResponse.status;
      lastErrorMessage = data.error?.message || "Gemini request failed.";

      if (!isRetryableStatus(geminiResponse.status) || attempt === 3) {
        break;
      }

      await sleep(attempt * 1500);
    }
  }

  throw new Error(
    lastStatusCode === 429 ||
      lastErrorMessage.toLowerCase().includes("high demand")
      ? "Gemini is busy right now. Please try again in a few seconds."
      : lastErrorMessage
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { error: "File upload is required." },
        { status: 400 }
      );
    }

    const file = fileValue;

    if (!supportedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload PDF, DOCX, PNG, JPG, JPEG, or WEBP.",
        },
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

    let rawText = "";
    let modelUsed = "";

    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const extractedText = await extractDocxText(file);

      if (!extractedText) {
        return NextResponse.json(
          { error: "Could not extract text from the DOCX file." },
          { status: 400 }
        );
      }

      const result = await callGeminiWithTextPrompt(
        buildPromptForExtractedText(file.name, extractedText),
        apiKey,
        models
      );

      rawText = result.rawText;
      modelUsed = result.modelUsed;
    } else {
      const result = await callGeminiWithInlineFile(file, apiKey, models);
      rawText = result.rawText;
      modelUsed = result.modelUsed;
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

    return NextResponse.json({ tasks, modelUsed });
  } catch (error) {
    console.error("Generate tasks from file error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating tasks from the uploaded file.",
      },
      { status: 500 }
    );
  }
}