import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { jsonError } from "@/lib/server/http";
import { pairDeviceSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const db = getDb();
    const input = pairDeviceSchema.parse(await request.json());

    const serialNumber = input.serialNumber?.trim() || null;
    const [existing] = serialNumber
      ? await db
          .select()
          .from(devices)
          .where(and(eq(devices.userId, session.userId), eq(devices.serialNumber, serialNumber)))
          .limit(1)
      : [];

    const [device] = existing
      ? await db
          .update(devices)
          .set({
            deviceName: input.deviceName,
            manufacturer: input.manufacturer ?? null,
            model: input.model,
            firmwareVersion: input.firmwareVersion ?? null,
            metadata: input.metadata ?? {},
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(devices.id, existing.id))
          .returning()
      : await db
          .insert(devices)
          .values({
            userId: session.userId,
            deviceName: input.deviceName,
            manufacturer: input.manufacturer ?? null,
            model: input.model,
            serialNumber,
            firmwareVersion: input.firmwareVersion ?? null,
            metadata: input.metadata ?? {},
          })
          .returning();

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
