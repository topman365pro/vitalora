import { getEnv, getOptionalEnv } from "@/lib/env";
import type { AiMessage, AiProvider, ChatContextPayload } from "@/lib/ai/types";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
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

function extractText(payload: OpenAiResponse) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  if (Array.isArray(payload?.output)) {
    return payload.output
      .flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n");
  }

  return "I could not generate a reply right now.";
}

export class OpenAiProvider implements AiProvider {
  async generateReply(context: ChatContextPayload): Promise<AiMessage> {
    const apiKey = getEnv("OPENAI_API_KEY");
    const model = getOptionalEnv("OPENAI_MODEL") ?? "gpt-4.1-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildPrompt(context),
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI request failed");
    }

    const payload = (await response.json()) as OpenAiResponse;

    return {
      text: extractText(payload),
      provider: "openai",
      model,
      inputTokens: payload?.usage?.input_tokens ?? null,
      outputTokens: payload?.usage?.output_tokens ?? null,
    };
  }
}
