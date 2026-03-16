import { NextResponse } from "next/server";

import { getAiProvider } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { buildChatContext } from "@/lib/server/chat-context";
import { addMessage, getThread, listMessages, updateThread } from "@/lib/server/chat-store";
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
    const thread = await getThread(session.uid, threadId);

    if (!thread) {
      throw new ApiError("Thread not found", 404);
    }

    const messages = await listMessages(session.uid, threadId);

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
    const input = messageSchema.parse(await request.json());
    const thread = await getThread(session.uid, threadId);

    if (!thread) {
      throw new ApiError("Thread not found", 404);
    }

    const userMessage = await addMessage({
      userId: session.uid,
      threadId,
      role: "user",
      content: input.content.trim(),
      contextSnapshot: {},
    });

    const contextPayload = await buildChatContext(session.uid, threadId, input.content.trim());
    const provider = getAiProvider();
    const reply = await provider.generateReply(contextPayload);
    const assistantMessage = await addMessage({
      userId: session.uid,
      threadId,
      role: "assistant",
      content: reply.text,
      contextSnapshot: contextPayload as Record<string, unknown>,
    });

    await updateThread(session.uid, threadId, {
      title: thread.title === "New conversation" ? titleFromPrompt(input.content) : thread.title,
    });

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
