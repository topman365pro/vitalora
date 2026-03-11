import { afterEach, describe, expect, it, vi } from "vitest";

import { MockDeviceAdapter, generateMockBatch } from "@/lib/ble/mock-device-adapter";

describe("MockDeviceAdapter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits normalized mock batches with metrics and samples", () => {
    const batch = generateMockBatch();

    expect(batch.metrics.heartRateBpm).toBeGreaterThan(0);
    expect(batch.metrics.spo2Percent).toBeGreaterThan(0);
    expect(batch.ppgSamples.length).toBeGreaterThan(0);
    expect(batch.motionSamples.length).toBeGreaterThan(0);
    expect(batch.rawPayload.source).toBe("mock");
  });

  it("starts and stops interval streaming", async () => {
    vi.useFakeTimers();
    const adapter = new MockDeviceAdapter();
    const batches: string[] = [];

    await adapter.startStreaming((batch) => {
      batches.push(batch.capturedAt);
    });

    expect(batches.length).toBe(1);
    vi.advanceTimersByTime(5200);
    expect(batches.length).toBeGreaterThanOrEqual(3);

    await adapter.stopStreaming();
    vi.advanceTimersByTime(5000);
    expect(batches.length).toBeGreaterThanOrEqual(3);
  });
});
