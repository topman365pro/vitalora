import type { AiMessage, AiProvider, ChatContextPayload } from "@/lib/ai/types";

function metricLine(label: string, value: unknown, suffix = "") {
  if (value === null || value === undefined) {
    return null;
  }

  return `${label}: ${value}${suffix}`;
}

export class MockAiProvider implements AiProvider {
  async generateReply(context: ChatContextPayload): Promise<AiMessage> {
    const latest = context.latestReading ?? {};
    const observations = [
      metricLine("Heart rate", latest.heartRateBpm, " bpm"),
      metricLine("SpO2", latest.spo2Percent, "%"),
      metricLine("Body temperature", latest.bodyTempC, " C"),
      metricLine("Signal quality", latest.signalQuality),
    ].filter(Boolean);

    return {
      text: [
        "This is a mock wellness coach response based on your recent sensor data.",
        context.trendSummary,
        observations.length > 0 ? `Latest reading snapshot: ${observations.join(", ")}.` : null,
        `About your question: "${context.userQuestion}"`,
        "Consider using the trend view to compare recovery, hydration, stress, and sleep context over time. This app does not provide medical diagnosis.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      provider: "mock",
      model: "mock-wellness-coach",
      inputTokens: null,
      outputTokens: null,
    };
  }
}
