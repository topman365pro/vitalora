import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { listDevices } from "@/lib/server/firebase-store";
import { jsonError } from "@/lib/server/http";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await listDevices(session.uid);

    return NextResponse.json({
      devices: rows.map((device) => ({
        ...device,
        pairedAt: device.pairedAt.toISOString(),
        lastSyncedAt: device.lastSyncedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
