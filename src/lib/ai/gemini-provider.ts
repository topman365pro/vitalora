import { getEnv, getOptionalEnv } from "@/lib/env";
import type { AiMessage, AiProvider, ChatContextPayload } from "@/lib/ai/types";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
};

function buildPrompt(context: ChatContextPayload) {
  return [
    "You are Vitaloria Coach, a wellness-focused assistant.",
    "Do not diagnose conditions. Do not present yourself as a clinician.",
    "Use a supportive but concise tone.",
    "If data quality is weak or sparse, say so.",
    `Trend summary: ${context.trendSummary}`,
    `Active device: ${JSON.stringify(context.activeDevice ?? {})}`,
    `Latest reading: ${JSON.stringify(context.latestReading ?? {})}`,
    `Recent messages: ${JSON.stringify(context.recentMessages)}`,
    `User question: ${context.userQuestion}`,
  ].join("\n");
}

function extractText(payload: GeminiGenerateContentResponse) {
  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n");

  return text || "I could not generate a reply right now.";
}

export class GeminiProvider implements AiProvider {
  async generateReply(context: ChatContextPayload): Promise<AiMessage> {
    const apiKey = getEnv("GEMINI_API_KEY");
    const model = getOptionalEnv("GEMINI_MODEL") ?? "gemini-3-flash-preview";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(context),
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Gemini request failed");
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;

    return {
      text: extractText(payload),
      provider: "gemini",
      model,
      inputTokens: payload.usageMetadata?.promptTokenCount ?? null,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}
