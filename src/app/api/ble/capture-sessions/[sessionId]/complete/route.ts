import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { completeCaptureSession } from "@/lib/server/firebase-store";
import { ApiError, jsonError } from "@/lib/server/http";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await requireSession();
    const { sessionId } = await context.params;
    const captureSession = await completeCaptureSession(session.uid, sessionId);

    if (!captureSession) {
      throw new ApiError("Capture session not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
