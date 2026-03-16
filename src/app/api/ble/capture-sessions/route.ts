import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { ApiError, jsonError } from "@/lib/server/http";
import { createCaptureSession, getDevice } from "@/lib/server/firebase-store";
import { createCaptureSessionSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = createCaptureSessionSchema.parse(await request.json());
    const device = await getDevice(session.uid, input.deviceId);

    if (!device) {
      throw new ApiError("Device not found", 404);
    }

    const captureSession = await createCaptureSession({
      uid: session.uid,
      deviceId: input.deviceId,
      source: input.source,
      rawMetadata: input.rawMetadata ?? {},
    });

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
