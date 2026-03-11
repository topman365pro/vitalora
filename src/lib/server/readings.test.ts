import { describe, expect, it } from "vitest";

import { summarizeReadings, type ReadingPoint } from "@/lib/server/readings";

describe("summarizeReadings", () => {
  it("calculates averages and latest values from a series", () => {
    const readings: ReadingPoint[] = [
      {
        id: "1",
        capturedAt: new Date("2026-03-11T07:00:00Z").toISOString(),
        bodyTempC: 36.5,
        roomTempC: 24.3,
        spo2Percent: 97.5,
        heartRateBpm: 72,
        signalQuality: 80,
        rawPayload: {},
      },
      {
        id: "2",
        capturedAt: new Date("2026-03-11T07:10:00Z").toISOString(),
        bodyTempC: 36.8,
        roomTempC: 24.1,
        spo2Percent: 98.2,
        heartRateBpm: 75,
        signalQuality: 84,
        rawPayload: {},
      },
    ];

    const summary = summarizeReadings(readings);

    expect(summary.latest?.id).toBe("2");
    expect(summary.averages.heartRateBpm).toBe(73.5);
    expect(summary.averages.spo2Percent).toBe(97.9);
  });
});
