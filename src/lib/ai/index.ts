import { getOptionalEnv } from "@/lib/env";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import type { AiProvider } from "@/lib/ai/types";

export function getAiProvider(): AiProvider {
  if (getOptionalEnv("GEMINI_API_KEY")) {
    return new GeminiProvider();
  }

  return new MockAiProvider();
}

export * from "@/lib/ai/types";
