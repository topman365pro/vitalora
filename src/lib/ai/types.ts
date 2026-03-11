export type ChatContextPayload = {
  latestReading: Record<string, unknown> | null;
  trendSummary: string;
  activeDevice: Record<string, unknown> | null;
  recentMessages: Array<{ role: string; content: string }>;
  userQuestion: string;
};

export type AiMessage = {
  text: string;
  provider: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export interface AiProvider {
  generateReply(context: ChatContextPayload): Promise<AiMessage>;
}
