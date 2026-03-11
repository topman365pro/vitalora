import { and, asc, desc, eq } from "drizzle-orm";

import type { ChatContextPayload } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { chatMessages, chatThreads, devices } from "@/lib/db/schema";
import { getReadingHistory, summarizeReadings } from "@/lib/server/readings";

export function createTrendSummary(
  history: Awaited<ReturnType<typeof getReadingHistory>>,
) {
  if (history.length === 0) {
    return "No sensor history is available yet.";
  }

  const summary = summarizeReadings(history);
  const parts = [
    `Collected ${history.length} readings in the selected window.`,
    summary.averages.heartRateBpm ? `Average heart rate ${summary.averages.heartRateBpm} bpm.` : null,
    summary.averages.spo2Percent ? `Average SpO2 ${summary.averages.spo2Percent}%.` : null,
    summary.averages.bodyTempC ? `Average body temperature ${summary.averages.bodyTempC} C.` : null,
    summary.averages.signalQuality ? `Average signal quality ${summary.averages.signalQuality}.` : null,
  ];

  return parts.filter(Boolean).join(" ");
}

export async function buildChatContext(
  userId: string,
  threadId: string,
  userQuestion: string,
): Promise<ChatContextPayload> {
  const db = getDb();
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
    .limit(1);

  const history = await getReadingHistory(userId, "24h");
  const [device, messages] = await Promise.all([
    thread?.deviceId
      ? db
          .select()
          .from(devices)
          .where(and(eq(devices.id, thread.deviceId), eq(devices.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(10),
  ]);

  const latest = history.at(-1) ?? null;

  return {
    latestReading: latest,
    trendSummary: createTrendSummary(history),
    activeDevice: device[0]
      ? {
          id: device[0].id,
          name: device[0].deviceName,
          model: device[0].model,
          lastSyncedAt: device[0].lastSyncedAt?.toISOString() ?? null,
        }
      : null,
    recentMessages: messages,
    userQuestion,
  };
}

export async function getThreadsWithMessages(userId: string) {
  const db = getDb();
  const threads = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt));

  if (threads.length === 0) {
    return { threads: [], messages: [] };
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threads[0].id))
    .orderBy(asc(chatMessages.createdAt));

  return { threads, messages };
}
