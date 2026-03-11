import { and, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bleCaptureSessions, devices, sensorReadings } from "@/lib/db/schema";
import { toNumber } from "@/lib/utils";

export type ReadingRange = "24h" | "7d" | "30d";

export type ReadingPoint = {
  id: string;
  capturedAt: string;
  bodyTempC: number | null;
  roomTempC: number | null;
  spo2Percent: number | null;
  heartRateBpm: number | null;
  signalQuality: number | null;
  rawPayload: Record<string, unknown>;
};

function getRangeStart(range: ReadingRange) {
  const now = new Date();

  if (range === "7d") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (range === "30d") {
    now.setDate(now.getDate() - 30);
    return now;
  }

  now.setHours(now.getHours() - 24);
  return now;
}

export function mapReading(row: typeof sensorReadings.$inferSelect): ReadingPoint {
  return {
    id: row.id,
    capturedAt: row.capturedAt.toISOString(),
    bodyTempC: toNumber(row.bodyTempC),
    roomTempC: toNumber(row.roomTempC),
    spo2Percent: toNumber(row.spo2Percent),
    heartRateBpm: row.heartRateBpm,
    signalQuality: row.signalQuality,
    rawPayload: row.rawPayload,
  };
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);

  if (filtered.length === 0) {
    return null;
  }

  const rawAverage = filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  return Math.round(rawAverage * 10) / 10;
}

export function summarizeReadings(readings: ReadingPoint[]) {
  const latest = readings.at(-1) ?? null;

  return {
    latest,
    averages: {
      heartRateBpm: average(readings.map((reading) => reading.heartRateBpm)),
      spo2Percent: average(readings.map((reading) => reading.spo2Percent)),
      bodyTempC: average(readings.map((reading) => reading.bodyTempC)),
      roomTempC: average(readings.map((reading) => reading.roomTempC)),
      signalQuality: average(readings.map((reading) => reading.signalQuality)),
    },
  };
}

export async function getReadingHistory(userId: string, range: ReadingRange = "24h") {
  const db = getDb();
  const rows = await db
    .select()
    .from(sensorReadings)
    .where(and(eq(sensorReadings.userId, userId), gte(sensorReadings.capturedAt, getRangeStart(range))))
    .orderBy(sensorReadings.capturedAt);

  return rows.map(mapReading);
}

export async function getReadingSummary(userId: string, range: ReadingRange = "24h") {
  const [history, deviceRows, captureRows] = await Promise.all([
    getReadingHistory(userId, range),
    getDb().select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.pairedAt)),
    getDb()
      .select()
      .from(bleCaptureSessions)
      .where(eq(bleCaptureSessions.userId, userId))
      .orderBy(desc(bleCaptureSessions.startedAt))
      .limit(8),
  ]);

  return {
    ...summarizeReadings(history),
    history,
    devices: deviceRows.map((device) => ({
      ...device,
      pairedAt: device.pairedAt.toISOString(),
      lastSyncedAt: device.lastSyncedAt?.toISOString() ?? null,
    })),
    captureSessions: captureRows.map((session) => ({
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
  };
}
