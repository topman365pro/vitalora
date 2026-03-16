import { DashboardShell } from "@/components/dashboard-shell";
import { requireSession } from "@/lib/auth/session";
import { getThreadsWithMessages } from "@/lib/server/chat-context";
import { getReadingSummary } from "@/lib/server/readings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const [summary, chat] = await Promise.all([
    getReadingSummary(session.uid, "24h"),
    getThreadsWithMessages(session.uid),
  ]);

  return (
    <DashboardShell
      initialRange="24h"
      initialSummary={summary}
      initialThreads={chat.threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        deviceId: thread.deviceId,
        updatedAt: thread.updatedAt.toISOString(),
      }))}
      initialMessages={chat.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      }))}
    />
  );
}
