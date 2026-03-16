import type { ChatContextPayload } from "@/lib/ai";
import { getDevice } from "@/lib/server/firebase-store";
import { getThread, listMessages, listThreads } from "@/lib/server/chat-store";
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
  uid: string,
  threadId: string,
  userQuestion: string,
): Promise<ChatContextPayload> {
  const thread = await getThread(uid, threadId);

  const history = await getReadingHistory(uid, "24h");
  const [device, messages] = await Promise.all([
    thread?.deviceId ? getDevice(uid, thread.deviceId) : Promise.resolve(null),
    listMessages(uid, threadId).then((items) =>
      items.slice(0, 10).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ),
  ]);

  const latest = history.at(-1) ?? null;

  return {
    latestReading: latest,
    trendSummary: createTrendSummary(history),
    activeDevice: device
      ? {
          id: device.id,
          name: device.deviceName,
          model: device.model,
          lastSyncedAt: device.lastSyncedAt?.toISOString() ?? null,
        }
      : null,
    recentMessages: messages,
    userQuestion,
  };
}

export async function getThreadsWithMessages(uid: string) {
  const threads = await listThreads(uid);

  if (threads.length === 0) {
    return { threads: [], messages: [] };
  }

  const messages = await listMessages(uid, threads[0].id);

  return { threads, messages };
}
