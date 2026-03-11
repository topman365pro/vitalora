import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    firebaseUid: text("firebase_uid"),
    authProvider: text("auth_provider"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    gender: text("gender"),
    status: text("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_lower_uidx").using("btree", sql`LOWER(${table.email})`),
    uniqueIndex("users_firebase_uid_uidx")
      .on(table.firebaseUid)
      .where(sql`${table.firebaseUid} IS NOT NULL`),
    check(
      "users_status_check",
      sql`${table.status} IN ('active', 'pending', 'suspended', 'disabled')`,
    ),
  ],
);

export const userLoginEvents = pgTable(
  "user_login_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    emailAttempted: text("email_attempted"),
    loggedInAt: timestamp("logged_in_at", { withTimezone: true }).notNull().defaultNow(),
    success: boolean("success").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_login_events_user_logged_in_idx").on(table.userId, table.loggedInAt),
    check(
      "user_login_events_failure_reason_check",
      sql`((${table.success} = TRUE AND ${table.failureReason} IS NULL) OR (${table.success} = FALSE))`,
    ),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceName: text("device_name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model").notNull(),
    serialNumber: text("serial_number"),
    firmwareVersion: text("firmware_version"),
    pairedAt: timestamp("paired_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("devices_id_user_id_key").on(table.id, table.userId),
    uniqueIndex("devices_serial_number_uidx")
      .on(table.serialNumber)
      .where(sql`${table.serialNumber} IS NOT NULL`),
    index("devices_user_id_idx").on(table.userId),
    check(
      "devices_status_check",
      sql`${table.status} IN ('active', 'inactive', 'retired')`,
    ),
  ],
);

export const sensorReadings = pgTable(
  "sensor_readings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }),
    windowEndedAt: timestamp("window_ended_at", { withTimezone: true }),
    bodyTempC: numeric("body_temp_c", { precision: 4, scale: 2 }),
    roomTempC: numeric("room_temp_c", { precision: 4, scale: 2 }),
    spo2Percent: numeric("spo2_percent", { precision: 5, scale: 2 }),
    heartRateBpm: integer("heart_rate_bpm"),
    signalQuality: smallint("signal_quality"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sensor_readings_user_captured_idx").on(table.userId, table.capturedAt),
    index("sensor_readings_device_captured_idx").on(table.deviceId, table.capturedAt),
    check(
      "sensor_readings_time_window_check",
      sql`(${table.windowStartedAt} IS NULL OR ${table.windowEndedAt} IS NULL OR ${table.windowEndedAt} >= ${table.windowStartedAt})`,
    ),
  ],
);

export const ppgSamples = pgTable(
  "ppg_samples",
  {
    readingId: uuid("reading_id")
      .notNull()
      .references(() => sensorReadings.id, { onDelete: "cascade" }),
    sampleIndex: integer("sample_index").notNull(),
    capturedOffsetMs: integer("captured_offset_ms"),
    sampleValue: integer("sample_value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.readingId, table.sampleIndex] })],
);

export const motionSamples = pgTable(
  "motion_samples",
  {
    readingId: uuid("reading_id")
      .notNull()
      .references(() => sensorReadings.id, { onDelete: "cascade" }),
    sampleIndex: integer("sample_index").notNull(),
    capturedOffsetMs: integer("captured_offset_ms"),
    accelX: numeric("accel_x", { precision: 10, scale: 5 }).notNull(),
    accelY: numeric("accel_y", { precision: 10, scale: 5 }).notNull(),
    accelZ: numeric("accel_z", { precision: 10, scale: 5 }).notNull(),
    gyroX: numeric("gyro_x", { precision: 10, scale: 5 }).notNull(),
    gyroY: numeric("gyro_y", { precision: 10, scale: 5 }).notNull(),
    gyroZ: numeric("gyro_z", { precision: 10, scale: 5 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.readingId, table.sampleIndex] })],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt)],
);

export const bleCaptureSessions = pgTable(
  "ble_capture_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("browser_ble"),
    notes: text("notes"),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ble_capture_sessions_user_started_idx").on(table.userId, table.startedAt),
    check(
      "ble_capture_sessions_status_check",
      sql`${table.status} IN ('active', 'completed', 'failed')`,
    ),
  ],
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id"),
    title: text("title").notNull().default("New conversation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_threads_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
    check("chat_messages_role_check", sql`${table.role} IN ('user', 'assistant', 'system')`),
  ],
);

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_runs_thread_created_idx").on(table.threadId, table.createdAt),
    check("ai_runs_status_check", sql`${table.status} IN ('started', 'completed', 'failed')`),
  ],
);

export const schema = {
  users,
  userLoginEvents,
  devices,
  sensorReadings,
  ppgSamples,
  motionSamples,
  authSessions,
  bleCaptureSessions,
  chatThreads,
  chatMessages,
  aiRuns,
};

export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type SensorReading = typeof sensorReadings.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
