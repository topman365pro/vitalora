import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { jsonError } from "@/lib/server/http";

export async function GET() {
  try {
    const session = await requireSession();
    const rows = await getDb()
      .select()
      .from(devices)
      .where(eq(devices.userId, session.userId))
      .orderBy(desc(devices.pairedAt));

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
