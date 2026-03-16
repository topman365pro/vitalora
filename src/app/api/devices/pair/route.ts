import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { pairDevice } from "@/lib/server/firebase-store";
import { jsonError } from "@/lib/server/http";
import { pairDeviceSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = pairDeviceSchema.parse(await request.json());
    const device = await pairDevice(session.uid, input);

    return NextResponse.json({
      device: {
        ...device,
        pairedAt: device.pairedAt.toISOString(),
        lastSyncedAt: device.lastSyncedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
