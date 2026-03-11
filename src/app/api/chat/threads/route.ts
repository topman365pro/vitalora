import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { chatThreads } from "@/lib/db/schema";
import { jsonError } from "@/lib/server/http";
import { threadSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    const session = await requireSession();
    const threads = await getDb()
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.userId, session.userId))
      .orderBy(desc(chatThreads.updatedAt));

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
    const db = getDb();
    const input = threadSchema.parse(await request.json());
    const [thread] = await db
      .insert(chatThreads)
      .values({
        userId: session.userId,
        deviceId: input.deviceId ?? null,
        title: input.title?.trim() || "New conversation",
      })
      .returning();

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
