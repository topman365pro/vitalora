import { randomUUID } from "node:crypto";

import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/admin";
import type {
  PairDeviceInput,
  ReadingBatchRequestInput,
} from "@/lib/server/validation";

export type StoredUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providers: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type StoredDevice = {
  id: string;
  deviceName: string;
  manufacturer: string | null;
  model: string;
  serialNumber: string | null;
  firmwareVersion: string | null;
  status: string;
  metadata: Record<string, unknown>;
  pairedAt: Date;
  lastSyncedAt: Date | null;
};

export type StoredCaptureSession = {
  id: string;
  deviceId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  source: string;
  notes: string | null;
  rawMetadata: Record<string, unknown>;
};

export type ReadingPoint = {
  id: string;
  deviceId: string;
  captureSessionId: string | null;
  capturedAt: string;
  windowStartedAt: string | null;
  windowEndedAt: string | null;
  bodyTempC: number | null;
  roomTempC: number | null;
  spo2Percent: number | null;
  heartRateBpm: number | null;
  signalQuality: number | null;
  rawPayload: Record<string, unknown>;
  ppgSamples: Array<{
    sampleIndex: number;
    capturedOffsetMs?: number | null;
    sampleValue: number;
  }>;
  motionSamples: Array<{
    sampleIndex: number;
    capturedOffsetMs?: number | null;
    accelX: number;
    accelY: number;
    accelZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  }>;
};

type FirestoreUserProfile = {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providers: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp | null;
};

type FirestoreDevice = {
  deviceName: string;
  manufacturer: string | null;
  model: string;
  serialNumber: string | null;
  firmwareVersion: string | null;
  status: string;
  metadata: Record<string, unknown>;
  pairedAt: Timestamp;
  lastSyncedAt: Timestamp | null;
};

type FirestoreCaptureSession = {
  deviceId: string;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: string;
  source: string;
  notes: string | null;
  rawMetadata: Record<string, unknown>;
};

type FirestoreReading = {
  deviceId: string;
  captureSessionId: string | null;
  capturedAt: Timestamp;
  windowStartedAt: Timestamp | null;
  windowEndedAt: Timestamp | null;
  metrics: {
    heartRateBpm: number | null;
    spo2Percent: number | null;
    bodyTempC: number | null;
    roomTempC: number | null;
    signalQuality: number | null;
  };
  rawPayload: Record<string, unknown>;
  ppgSamples: ReadingPoint["ppgSamples"];
  motionSamples: ReadingPoint["motionSamples"];
};

export type ReadingRange = "24h" | "7d" | "30d";

function userDoc(uid: string) {
  return getFirebaseFirestore().collection("users").doc(uid);
}

function devicesCollection(uid: string) {
  return userDoc(uid).collection("devices");
}

function captureSessionsCollection(uid: string) {
  return userDoc(uid).collection("captureSessions");
}

function readingsCollection(uid: string) {
  return userDoc(uid).collection("readings");
}

function toDate(value: Timestamp | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Timestamp ? value.toDate() : value;
}

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return Timestamp.fromDate(date);
}

function getProviders(decodedToken: DecodedIdToken) {
  const providers = new Set<string>();
  const signInProvider = decodedToken.firebase.sign_in_provider;

  if (signInProvider) {
    providers.add(signInProvider);
  }

  const identities = decodedToken.firebase.identities ?? {};

  for (const key of Object.keys(identities)) {
    providers.add(key);
  }

  return [...providers];
}

export async function upsertUserProfile(decodedToken: DecodedIdToken) {
  const ref = userDoc(decodedToken.uid);
  const snapshot = await ref.get();
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? null,
      photoURL: decodedToken.picture ?? null,
      providers: getProviders(decodedToken),
      updatedAt: now,
      lastLoginAt: now,
      ...(snapshot.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  const saved = await ref.get();
  const data = saved.data() as Partial<FirestoreUserProfile> | undefined;

  if (!data) {
    throw new Error("Failed to save Firestore user profile");
  }

  return {
    uid: saved.id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    providers: data.providers ?? [],
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
    lastLoginAt: toDate(data.lastLoginAt),
  } satisfies StoredUserProfile;
}

function mapDevice(
  id: string,
  data: Partial<FirestoreDevice> | undefined,
): StoredDevice | null {
  if (!data?.deviceName || !data.model || !data.pairedAt) {
    return null;
  }

  return {
    id,
    deviceName: data.deviceName,
    manufacturer: data.manufacturer ?? null,
    model: data.model,
    serialNumber: data.serialNumber ?? null,
    firmwareVersion: data.firmwareVersion ?? null,
    status: data.status ?? "active",
    metadata: data.metadata ?? {},
    pairedAt: toDate(data.pairedAt) ?? new Date(0),
    lastSyncedAt: toDate(data.lastSyncedAt),
  };
}

export async function listDevices(uid: string) {
  const snapshot = await devicesCollection(uid).orderBy("pairedAt", "desc").get();

  return snapshot.docs
    .map((doc) => mapDevice(doc.id, doc.data() as Partial<FirestoreDevice>))
    .filter((device): device is StoredDevice => Boolean(device));
}

export async function getDevice(uid: string, deviceId: string) {
  const snapshot = await devicesCollection(uid).doc(deviceId).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapDevice(snapshot.id, snapshot.data() as Partial<FirestoreDevice>);
}

export async function pairDevice(uid: string, input: PairDeviceInput) {
  const serialNumber = input.serialNumber?.trim() || null;
  const collection = devicesCollection(uid);
  let existingId: string | null = null;

  if (serialNumber) {
    const snapshot = await collection.where("serialNumber", "==", serialNumber).limit(1).get();
    existingId = snapshot.docs[0]?.id ?? null;
  }

  const ref = existingId ? collection.doc(existingId) : collection.doc(randomUUID());
  const current = await ref.get();
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      deviceName: input.deviceName,
      manufacturer: input.manufacturer ?? null,
      model: input.model,
      serialNumber,
      firmwareVersion: input.firmwareVersion ?? null,
      status: "active",
      metadata: input.metadata ?? {},
      lastSyncedAt: current.exists ? current.get("lastSyncedAt") ?? null : null,
      pairedAt: current.exists ? current.get("pairedAt") ?? now : now,
      updatedAt: now,
    },
    { merge: true },
  );

  const saved = await ref.get();
  const device = mapDevice(saved.id, saved.data() as Partial<FirestoreDevice>);

  if (!device) {
    throw new Error("Failed to save device");
  }

  return device;
}

function mapCaptureSession(
  id: string,
  data: Partial<FirestoreCaptureSession> | undefined,
): StoredCaptureSession | null {
  if (!data?.deviceId || !data.startedAt) {
    return null;
  }

  return {
    id,
    deviceId: data.deviceId,
    startedAt: toDate(data.startedAt) ?? new Date(0),
    endedAt: toDate(data.endedAt),
    status: data.status ?? "active",
    source: data.source ?? "browser_ble",
    notes: data.notes ?? null,
    rawMetadata: data.rawMetadata ?? {},
  };
}

export async function getCaptureSession(uid: string, sessionId: string) {
  const snapshot = await captureSessionsCollection(uid).doc(sessionId).get();

  if (!snapshot.exists) {
    return null;
  }

  return mapCaptureSession(snapshot.id, snapshot.data() as Partial<FirestoreCaptureSession>);
}

export async function createCaptureSession(params: {
  uid: string;
  deviceId: string;
  source: string;
  rawMetadata?: Record<string, unknown>;
}) {
  const ref = captureSessionsCollection(params.uid).doc(randomUUID());

  await ref.set({
    deviceId: params.deviceId,
    startedAt: FieldValue.serverTimestamp(),
    endedAt: null,
    status: "active",
    source: params.source,
    notes: null,
    rawMetadata: params.rawMetadata ?? {},
    createdAt: FieldValue.serverTimestamp(),
  });

  const saved = await ref.get();
  const session = mapCaptureSession(saved.id, saved.data() as Partial<FirestoreCaptureSession>);

  if (!session) {
    throw new Error("Failed to create capture session");
  }

  return session;
}

export async function completeCaptureSession(uid: string, sessionId: string) {
  const ref = captureSessionsCollection(uid).doc(sessionId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  await ref.set(
    {
      endedAt: FieldValue.serverTimestamp(),
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const saved = await ref.get();
  return mapCaptureSession(saved.id, saved.data() as Partial<FirestoreCaptureSession>);
}

export async function listRecentCaptureSessions(uid: string, limit = 8) {
  const snapshot = await captureSessionsCollection(uid).orderBy("startedAt", "desc").limit(limit).get();

  return snapshot.docs
    .map((doc) => mapCaptureSession(doc.id, doc.data() as Partial<FirestoreCaptureSession>))
    .filter((session): session is StoredCaptureSession => Boolean(session));
}

function mapReading(
  id: string,
  data: Partial<FirestoreReading> | undefined,
): ReadingPoint | null {
  if (!data?.deviceId || !data.capturedAt || !data.metrics) {
    return null;
  }

  return {
    id,
    deviceId: data.deviceId,
    captureSessionId: data.captureSessionId ?? null,
    capturedAt: (toDate(data.capturedAt) ?? new Date(0)).toISOString(),
    windowStartedAt: toDate(data.windowStartedAt)?.toISOString() ?? null,
    windowEndedAt: toDate(data.windowEndedAt)?.toISOString() ?? null,
    bodyTempC: data.metrics.bodyTempC ?? null,
    roomTempC: data.metrics.roomTempC ?? null,
    spo2Percent: data.metrics.spo2Percent ?? null,
    heartRateBpm: data.metrics.heartRateBpm ?? null,
    signalQuality: data.metrics.signalQuality ?? null,
    rawPayload: data.rawPayload ?? {},
    ppgSamples: data.ppgSamples ?? [],
    motionSamples: data.motionSamples ?? [],
  };
}

export async function saveReadingBatch(
  uid: string,
  input: ReadingBatchRequestInput,
) {
  const firestore = getFirebaseFirestore();
  const readingRef = readingsCollection(uid).doc(randomUUID());
  const deviceRef = devicesCollection(uid).doc(input.deviceId);
  const batch = firestore.batch();

  batch.set(readingRef, {
    deviceId: input.deviceId,
    captureSessionId: input.captureSessionId ?? null,
    capturedAt: toTimestamp(input.batch.capturedAt),
    windowStartedAt: toTimestamp(input.batch.windowStartedAt),
    windowEndedAt: toTimestamp(input.batch.windowEndedAt),
    metrics: {
      heartRateBpm: input.batch.metrics.heartRateBpm ?? null,
      spo2Percent: input.batch.metrics.spo2Percent ?? null,
      bodyTempC: input.batch.metrics.bodyTempC ?? null,
      roomTempC: input.batch.metrics.roomTempC ?? null,
      signalQuality: input.batch.metrics.signalQuality ?? null,
    },
    rawPayload: input.batch.rawPayload,
    ppgSamples: input.batch.ppgSamples,
    motionSamples: input.batch.motionSamples,
    createdAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    deviceRef,
    {
      lastSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  return readingRef.id;
}

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

export async function listReadings(uid: string, range: ReadingRange = "24h") {
  const snapshot = await readingsCollection(uid)
    .where("capturedAt", ">=", Timestamp.fromDate(getRangeStart(range)))
    .orderBy("capturedAt", "asc")
    .get();

  return snapshot.docs
    .map((doc) => mapReading(doc.id, doc.data() as Partial<FirestoreReading>))
    .filter((reading): reading is ReadingPoint => Boolean(reading));
}

export async function getLatestDeviceForThread(uid: string, deviceId: string) {
  return getDevice(uid, deviceId);
}
