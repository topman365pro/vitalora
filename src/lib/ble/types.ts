export type DeviceIdentity = {
  deviceName: string;
  manufacturer?: string | null;
  model: string;
  serialNumber?: string | null;
  firmwareVersion?: string | null;
  metadata?: Record<string, unknown>;
};

export type PpgSample = {
  sampleIndex: number;
  capturedOffsetMs?: number | null;
  sampleValue: number;
};

export type MotionSample = {
  sampleIndex: number;
  capturedOffsetMs?: number | null;
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
};

export type NormalizedReadingBatch = {
  capturedAt: string;
  windowStartedAt?: string | null;
  windowEndedAt?: string | null;
  metrics: {
    heartRateBpm?: number | null;
    spo2Percent?: number | null;
    bodyTempC?: number | null;
    roomTempC?: number | null;
    signalQuality?: number | null;
  };
  ppgSamples: PpgSample[];
  motionSamples: MotionSample[];
  rawPayload: Record<string, unknown>;
};

export type DeviceConnection = {
  id: string;
  name: string;
};

export interface DeviceAdapter {
  scanAndConnect(): Promise<DeviceConnection>;
  startStreaming(onBatch: (batch: NormalizedReadingBatch) => void): Promise<void>;
  stopStreaming(): Promise<void>;
  getDeviceMetadata(): Promise<DeviceIdentity>;
}
