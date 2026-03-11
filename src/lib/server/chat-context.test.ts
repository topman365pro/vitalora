import { describe, expect, it } from "vitest";

import { createTrendSummary } from "@/lib/server/chat-context";

describe("createTrendSummary", () => {
  it("returns a compact summary for recent readings", () => {
    const summary = createTrendSummary([
      {
        id: "1",
        capturedAt: new Date("2026-03-11T07:00:00Z").toISOString(),
        bodyTempC: 36.6,
        roomTempC: 24.4,
        spo2Percent: 98.2,
        heartRateBpm: 71,
        signalQuality: 83,
        rawPayload: {},
      },
      {
        id: "2",
        capturedAt: new Date("2026-03-11T07:05:00Z").toISOString(),
        bodyTempC: 36.7,
        roomTempC: 24.1,
        spo2Percent: 97.8,
        heartRateBpm: 74,
        signalQuality: 86,
        rawPayload: {},
      },
    ]);

    expect(summary).toContain("Collected 2 readings");
    expect(summary).toContain("Average heart rate 72.5 bpm.");
    expect(summary).toContain("Average SpO2 98%.");
  });

  it("handles an empty reading list", () => {
    expect(createTrendSummary([])).toBe("No sensor history is available yet.");
  });
});
