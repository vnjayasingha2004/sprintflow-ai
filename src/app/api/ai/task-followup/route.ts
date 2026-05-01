import { NextResponse } from "next/server";

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

type ChatHistoryItem = {
  role: "user" | "assistant";
  message: string;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimHistory(history: ChatHistoryItem[], maxItems = 6) {
  return history.slice(-maxItems);
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
      taskTitle?: unknown;
      taskDescription?: unknown;
      acceptanceCriteria?: unknown;
      breakdownSummary?: unknown;
      question?: unknown;
      history?: unknown;
    };

    const projectName =
      typeof payload.projectName === "string" ? payload.projectName.trim() : "";

    const taskTitle =
      typeof payload.taskTitle === "string" ? payload.taskTitle.trim() : "";

    const taskDescription =
      typeof payload.taskDescription === "string"
        ? payload.taskDescription.trim()
        : "";

    const breakdownSummary =
      typeof payload.breakdownSummary === "string"
        ? payload.breakdownSummary.trim()
        : "";

    const question =
      typeof payload.question === "string" ? payload.question.trim() : "";

    const acceptanceCriteria = Array.isArray(payload.acceptanceCriteria)
      ? payload.acceptanceCriteria.filter(
          (item): item is string => typeof item === "string"
        )
      : [];

    const history = Array.isArray(payload.history)
      ? payload.history.filter(
          (
            item
          ): item is {
            role: "user" | "assistant";
            message: string;
          } =>
            typeof item === "object" &&
            item !== null &&
            "role" in item &&
            "message" in item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.message === "string"
        )
      : [];

    if (!taskTitle) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
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

    const trimmedHistory = trimHistory(history, 6);

    const historyText =
      trimmedHistory.length > 0
        ? trimmedHistory
            .map((item) => `${item.role.toUpperCase()}: ${item.message}`)
            .join("\n")
        : "No previous conversation.";

    const systemInstruction = `
You are SprintFlow AI, an expert software implementation assistant.

You are answering follow-up questions about one specific software task.

Rules:
- Be practical and specific.
- Tailor the answer to the task context.
- Prefer implementation guidance over theory.
- Use concise sections or bullet points when helpful.
- If the question asks for code structure, APIs, DB schema, security, testing, or architecture, answer directly.
- Keep the answer focused on the current task only.
- Return plain text only.
`.trim();

    const userPrompt = `
Project: ${projectName || "Unknown Project"}

Task title: ${taskTitle}

Task description: ${taskDescription || "No description provided."}

Acceptance criteria:
${
  acceptanceCriteria.length > 0
    ? acceptanceCriteria.map((item) => `- ${item}`).join("\n")
    : "- No acceptance criteria provided."
}

Saved breakdown summary:
${breakdownSummary || "No breakdown summary available."}

Recent conversation:
${historyText}

User follow-up question:
${question}
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
                temperature: 0.5,
              },
            }),
          }
        );

        const data: GeminiResponse = await geminiResponse.json();
        lastStatusCode = geminiResponse.status;
        lastErrorMessage = data.error?.message || "Gemini request failed.";

        if (geminiResponse.ok) {
          const answer = extractTextFromGeminiResponse(data);

          if (!answer) {
            lastErrorMessage = "No answer was returned from Gemini.";
            lastStatusCode = 500;
            break;
          }

          return NextResponse.json({ answer, modelUsed: model });
        }

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
    console.error("Task follow-up generation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while generating the follow-up answer." },
      { status: 500 }
    );
  }
}