import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { bleCaptureSessions } from "@/lib/db/schema";
import { ApiError, jsonError } from "@/lib/server/http";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { sessionId } = await context.params;
    const db = getDb();
    const [captureSession] = await db
      .update(bleCaptureSessions)
      .set({
        endedAt: new Date(),
        status: "completed",
      })
      .where(and(eq(bleCaptureSessions.id, sessionId), eq(bleCaptureSessions.userId, session.userId)))
      .returning();

    if (!captureSession) {
      throw new ApiError("Capture session not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
