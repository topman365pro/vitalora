import type {
  DeviceAdapter,
  DeviceConnection,
  DeviceIdentity,
  MotionSample,
  NormalizedReadingBatch,
  PpgSample,
} from "@/lib/ble/types";

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function buildPpgSamples() {
  return Array.from({ length: 16 }, (_, index) => {
    const sample: PpgSample = {
      sampleIndex: index,
      capturedOffsetMs: index * 30,
      sampleValue: Math.round(900 + Math.sin(index / 2) * 120 + Math.random() * 25),
    };

    return sample;
  });
}

function buildMotionSamples() {
  return Array.from({ length: 8 }, (_, index) => {
    const sample: MotionSample = {
      sampleIndex: index,
      capturedOffsetMs: index * 60,
      accelX: randomBetween(-0.4, 0.4),
      accelY: randomBetween(-0.5, 0.5),
      accelZ: randomBetween(0.8, 1.1),
      gyroX: randomBetween(-8, 8),
      gyroY: randomBetween(-8, 8),
      gyroZ: randomBetween(-8, 8),
    };

    return sample;
  });
}

export function generateMockBatch(): NormalizedReadingBatch {
  const now = new Date();
  const heartRateBpm = Math.round(randomBetween(62, 104));
  const spo2Percent = Number(randomBetween(95.8, 99.4).toFixed(1));
  const bodyTempC = Number(randomBetween(36.2, 37.4).toFixed(1));
  const roomTempC = Number(randomBetween(22.4, 26.8).toFixed(1));
  const signalQuality = Math.round(randomBetween(72, 99));

  return {
    capturedAt: now.toISOString(),
    windowStartedAt: new Date(now.getTime() - 1000).toISOString(),
    windowEndedAt: now.toISOString(),
    metrics: {
      heartRateBpm,
      spo2Percent,
      bodyTempC,
      roomTempC,
      signalQuality,
    },
    ppgSamples: buildPpgSamples(),
    motionSamples: buildMotionSamples(),
    rawPayload: {
      source: "mock",
      batteryPercent: Math.round(randomBetween(46, 98)),
      contact: "good",
    },
  };
}

export class MockDeviceAdapter implements DeviceAdapter {
  private timer: ReturnType<typeof setInterval> | null = null;

  async scanAndConnect(): Promise<DeviceConnection> {
    return {
      id: `mock-${crypto.randomUUID()}`,
      name: "Vitaloria Pulse Demo",
    };
  }

  async startStreaming(onBatch: (batch: NormalizedReadingBatch) => void) {
    if (this.timer) {
      return;
    }

    onBatch(generateMockBatch());

    this.timer = setInterval(() => {
      onBatch(generateMockBatch());
    }, 2500);
  }

  async stopStreaming() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async getDeviceMetadata(): Promise<DeviceIdentity> {
    return {
      deviceName: "Vitaloria Pulse Demo",
      manufacturer: "Vitaloria Labs",
      model: "VP-01",
      serialNumber: "MOCK-VP-01",
      firmwareVersion: "demo-0.1.0",
      metadata: {
        adapter: "mock",
      },
    };
  }
}
