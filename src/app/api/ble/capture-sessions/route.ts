import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { bleCaptureSessions, devices } from "@/lib/db/schema";
import { ApiError, jsonError } from "@/lib/server/http";
import { createCaptureSessionSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const db = getDb();
    const input = createCaptureSessionSchema.parse(await request.json());
    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.id, input.deviceId), eq(devices.userId, session.userId)))
      .limit(1);

    if (!device) {
      throw new ApiError("Device not found", 404);
    }

    const [captureSession] = await db
      .insert(bleCaptureSessions)
      .values({
        userId: session.userId,
        deviceId: input.deviceId,
        source: input.source,
        rawMetadata: input.rawMetadata ?? {},
      })
      .returning();

    return NextResponse.json({
      captureSession: {
        ...captureSession,
        startedAt: captureSession.startedAt.toISOString(),
        endedAt: captureSession.endedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
