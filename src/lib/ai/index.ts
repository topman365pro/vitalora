import { getOptionalEnv } from "@/lib/env";
import { MockAiProvider } from "@/lib/ai/mock-provider";
import { OpenAiProvider } from "@/lib/ai/openai-provider";
import type { AiProvider } from "@/lib/ai/types";

export function getAiProvider(): AiProvider {
  if (getOptionalEnv("OPENAI_API_KEY")) {
    return new OpenAiProvider();
  }

  return new MockAiProvider();
}

export * from "@/lib/ai/types";
