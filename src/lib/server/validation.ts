import { z } from "zod";

const emailSchema = z.email().max(320).transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(8).max(256);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(120),
});

export const firebaseSessionSchema = z.object({
  idToken: z.string().min(1),
});

export const pairDeviceSchema = z.object({
  deviceName: z.string().min(2).max(120),
  manufacturer: z.string().max(120).optional().nullable(),
  model: z.string().min(2).max(120),
  serialNumber: z.string().max(120).optional().nullable(),
  firmwareVersion: z.string().max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCaptureSessionSchema = z.object({
  deviceId: z.uuid(),
  source: z.string().default("browser_ble"),
  rawMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const ppgSampleSchema = z.object({
  sampleIndex: z.number().int().nonnegative(),
  capturedOffsetMs: z.number().int().nonnegative().nullable().optional(),
  sampleValue: z.number().int(),
});

export const motionSampleSchema = z.object({
  sampleIndex: z.number().int().nonnegative(),
  capturedOffsetMs: z.number().int().nonnegative().nullable().optional(),
  accelX: z.number(),
  accelY: z.number(),
  accelZ: z.number(),
  gyroX: z.number(),
  gyroY: z.number(),
  gyroZ: z.number(),
});

export const normalizedReadingBatchSchema = z.object({
  capturedAt: z.string(),
  windowStartedAt: z.string().nullable().optional(),
  windowEndedAt: z.string().nullable().optional(),
  metrics: z.object({
    heartRateBpm: z.number().int().nullable().optional(),
    spo2Percent: z.number().nullable().optional(),
    bodyTempC: z.number().nullable().optional(),
    roomTempC: z.number().nullable().optional(),
    signalQuality: z.number().int().nullable().optional(),
  }),
  ppgSamples: z.array(ppgSampleSchema).default([]),
  motionSamples: z.array(motionSampleSchema).default([]),
  rawPayload: z.record(z.string(), z.unknown()).default({}),
});

export const readingBatchRequestSchema = z.object({
  deviceId: z.uuid(),
  captureSessionId: z.uuid().optional(),
  batch: normalizedReadingBatchSchema,
});

export const threadSchema = z.object({
  deviceId: z.uuid().optional().nullable(),
  title: z.string().max(120).optional().nullable(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const rangeSchema = z.enum(["24h", "7d", "30d"]).default("24h");

export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;
export type NormalizedReadingBatchInput = z.infer<typeof normalizedReadingBatchSchema>;
export type ReadingBatchRequestInput = z.infer<typeof readingBatchRequestSchema>;
