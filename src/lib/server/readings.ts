import {
  listDevices,
  listReadings,
  listRecentCaptureSessions,
  type ReadingPoint,
  type ReadingRange,
} from "@/lib/server/firebase-store";

export type { ReadingPoint, ReadingRange } from "@/lib/server/firebase-store";

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

export async function getReadingHistory(uid: string, range: ReadingRange = "24h") {
  return listReadings(uid, range);
}

export async function getReadingSummary(uid: string, range: ReadingRange = "24h") {
  const [history, devices, captureSessions] = await Promise.all([
    getReadingHistory(uid, range),
    listDevices(uid),
    listRecentCaptureSessions(uid, 8),
  ]);

  return {
    ...summarizeReadings(history),
    history,
    devices: devices.map((device) => ({
      ...device,
      pairedAt: device.pairedAt.toISOString(),
      lastSyncedAt: device.lastSyncedAt?.toISOString() ?? null,
    })),
    captureSessions: captureSessions.map((session) => ({
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
    })),
  };
}
