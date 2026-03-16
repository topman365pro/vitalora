import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/server/http";
import { createThread, listThreads } from "@/lib/server/chat-store";
import { threadSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    const session = await requireSession();
    const threads = await listThreads(session.uid);

    return NextResponse.json({
      threads: threads.map((thread) => ({
        ...thread,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = threadSchema.parse(await request.json());
    const thread = await createThread({
      userId: session.uid,
      deviceId: input.deviceId ?? null,
      title: input.title?.trim() || "New conversation",
    });

    return NextResponse.json({
      thread: {
        ...thread,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
