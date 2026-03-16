import { describe, expect, it } from "vitest";

import { summarizeReadings, type ReadingPoint } from "@/lib/server/readings";

describe("summarizeReadings", () => {
  it("calculates averages and latest values from a series", () => {
    const readings: ReadingPoint[] = [
      {
        id: "1",
        deviceId: "device-1",
        captureSessionId: null,
        capturedAt: new Date("2026-03-11T07:00:00Z").toISOString(),
        windowStartedAt: null,
        windowEndedAt: null,
        bodyTempC: 36.5,
        roomTempC: 24.3,
        spo2Percent: 97.5,
        heartRateBpm: 72,
        signalQuality: 80,
        rawPayload: {},
        ppgSamples: [],
        motionSamples: [],
      },
      {
        id: "2",
        deviceId: "device-1",
        captureSessionId: null,
        capturedAt: new Date("2026-03-11T07:10:00Z").toISOString(),
        windowStartedAt: null,
        windowEndedAt: null,
        bodyTempC: 36.8,
        roomTempC: 24.1,
        spo2Percent: 98.2,
        heartRateBpm: 75,
        signalQuality: 84,
        rawPayload: {},
        ppgSamples: [],
        motionSamples: [],
      },
    ];

    const summary = summarizeReadings(readings);

    expect(summary.latest?.id).toBe("2");
    expect(summary.averages.heartRateBpm).toBe(73.5);
    expect(summary.averages.spo2Percent).toBe(97.9);
  });
});
