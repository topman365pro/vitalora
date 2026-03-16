import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getCaptureSession, getDevice, saveReadingBatch } from "@/lib/server/firebase-store";
import { ApiError, jsonError } from "@/lib/server/http";
import { readingBatchRequestSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = readingBatchRequestSchema.parse(await request.json());
    const device = await getDevice(session.uid, input.deviceId);

    if (!device) {
      throw new ApiError("Device not found", 404);
    }

    if (input.captureSessionId) {
      const captureSession = await getCaptureSession(session.uid, input.captureSessionId);

      if (!captureSession) {
        throw new ApiError("Capture session not found", 404);
      }
    }

    const readingId = await saveReadingBatch(session.uid, input);

    return NextResponse.json({ readingId });
  } catch (error) {
    return jsonError(error);
  }
}
