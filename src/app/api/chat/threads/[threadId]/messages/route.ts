import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getAiProvider } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { aiRuns, chatMessages, chatThreads } from "@/lib/db/schema";
import { buildChatContext } from "@/lib/server/chat-context";
import { ApiError, jsonError } from "@/lib/server/http";
import { messageSchema } from "@/lib/server/validation";
import { titleFromPrompt } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { threadId } = await context.params;
    const db = getDb();
    const [thread] = await db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, session.userId)))
      .limit(1);

    if (!thread) {
      throw new ApiError("Thread not found", 404);
    }

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({
      messages: messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { threadId } = await context.params;
    const db = getDb();
    const input = messageSchema.parse(await request.json());
    const [thread] = await db
      .select()
      .from(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, session.userId)))
      .limit(1);

    if (!thread) {
      throw new ApiError("Thread not found", 404);
    }

    const [userMessage] = await db
      .insert(chatMessages)
      .values({
        threadId,
        role: "user",
        content: input.content.trim(),
        contextSnapshot: {},
      })
      .returning();

    const contextPayload = await buildChatContext(session.userId, threadId, input.content.trim());
    const provider = getAiProvider();
    const [startedRun] = await db
      .insert(aiRuns)
      .values({
        threadId,
        provider: provider.constructor.name,
        model: "pending",
        status: "started",
      })
      .returning();

    const reply = await provider.generateReply(contextPayload);
    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({
        threadId,
        role: "assistant",
        content: reply.text,
        contextSnapshot: contextPayload as Record<string, unknown>,
      })
      .returning();

    await db
      .update(aiRuns)
      .set({
        provider: reply.provider,
        model: reply.model,
        status: "completed",
        inputTokens: reply.inputTokens ?? null,
        outputTokens: reply.outputTokens ?? null,
      })
      .where(eq(aiRuns.id, startedRun.id));

    await db
      .update(chatThreads)
      .set({
        title: thread.title === "New conversation" ? titleFromPrompt(input.content) : thread.title,
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, threadId));

    return NextResponse.json({
      userMessage: {
        ...userMessage,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        ...assistantMessage,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
