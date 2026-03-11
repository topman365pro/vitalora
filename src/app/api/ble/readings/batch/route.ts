import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  bleCaptureSessions,
  devices,
  motionSamples,
  ppgSamples,
  sensorReadings,
} from "@/lib/db/schema";
import { ApiError, jsonError } from "@/lib/server/http";
import { readingBatchRequestSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const db = getDb();
    const input = readingBatchRequestSchema.parse(await request.json());
    const [device] = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, input.deviceId), eq(devices.userId, session.userId)))
      .limit(1);

    if (!device) {
      throw new ApiError("Device not found", 404);
    }

    if (input.captureSessionId) {
      const [captureSession] = await db
        .select({ id: bleCaptureSessions.id })
        .from(bleCaptureSessions)
        .where(
          and(
            eq(bleCaptureSessions.id, input.captureSessionId),
            eq(bleCaptureSessions.userId, session.userId),
          ),
        )
        .limit(1);

      if (!captureSession) {
        throw new ApiError("Capture session not found", 404);
      }
    }

    const result = await db.transaction(async (tx) => {
      const [reading] = await tx
        .insert(sensorReadings)
        .values({
          userId: session.userId,
          deviceId: input.deviceId,
          capturedAt: new Date(input.batch.capturedAt),
          windowStartedAt: input.batch.windowStartedAt ? new Date(input.batch.windowStartedAt) : null,
          windowEndedAt: input.batch.windowEndedAt ? new Date(input.batch.windowEndedAt) : null,
          bodyTempC: input.batch.metrics.bodyTempC?.toString() ?? null,
          roomTempC: input.batch.metrics.roomTempC?.toString() ?? null,
          spo2Percent: input.batch.metrics.spo2Percent?.toString() ?? null,
          heartRateBpm: input.batch.metrics.heartRateBpm ?? null,
          signalQuality: input.batch.metrics.signalQuality ?? null,
          rawPayload: input.batch.rawPayload,
        })
        .returning();

      if (input.batch.ppgSamples.length > 0) {
        await tx.insert(ppgSamples).values(
          input.batch.ppgSamples.map((sample) => ({
            readingId: reading.id,
            sampleIndex: sample.sampleIndex,
            capturedOffsetMs: sample.capturedOffsetMs ?? null,
            sampleValue: sample.sampleValue,
          })),
        );
      }

      if (input.batch.motionSamples.length > 0) {
        await tx.insert(motionSamples).values(
          input.batch.motionSamples.map((sample) => ({
            readingId: reading.id,
            sampleIndex: sample.sampleIndex,
            capturedOffsetMs: sample.capturedOffsetMs ?? null,
            accelX: sample.accelX.toString(),
            accelY: sample.accelY.toString(),
            accelZ: sample.accelZ.toString(),
            gyroX: sample.gyroX.toString(),
            gyroY: sample.gyroY.toString(),
            gyroZ: sample.gyroZ.toString(),
          })),
        );
      }

      await tx
        .update(devices)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, input.deviceId));

      return reading;
    });

    return NextResponse.json({ readingId: result.id });
  } catch (error) {
    return jsonError(error);
  }
}
