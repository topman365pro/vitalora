BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_status_check
    CHECK (status IN ('active', 'pending', 'suspended', 'disabled'))
);

CREATE UNIQUE INDEX users_email_lower_uidx
  ON users (LOWER(email));

CREATE TABLE user_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email_attempted TEXT,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_login_events_failure_reason_check
    CHECK (
      (success = TRUE AND failure_reason IS NULL) OR
      (success = FALSE)
    )
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT NOT NULL,
  serial_number TEXT,
  firmware_version TEXT,
  paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT devices_status_check
    CHECK (status IN ('active', 'inactive', 'retired')),
  CONSTRAINT devices_id_user_id_key
    UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX devices_serial_number_uidx
  ON devices (serial_number)
  WHERE serial_number IS NOT NULL;

CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  window_started_at TIMESTAMPTZ,
  window_ended_at TIMESTAMPTZ,
  body_temp_c NUMERIC(4, 2),
  room_temp_c NUMERIC(4, 2),
  spo2_percent NUMERIC(5, 2),
  heart_rate_bpm INTEGER,
  signal_quality SMALLINT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sensor_readings_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT sensor_readings_device_user_fk
    FOREIGN KEY (device_id, user_id)
    REFERENCES devices(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT sensor_readings_time_window_check
    CHECK (
      window_started_at IS NULL OR
      window_ended_at IS NULL OR
      window_ended_at >= window_started_at
    ),
  CONSTRAINT sensor_readings_body_temp_check
    CHECK (body_temp_c IS NULL OR body_temp_c BETWEEN 25.00 AND 45.00),
  CONSTRAINT sensor_readings_room_temp_check
    CHECK (room_temp_c IS NULL OR room_temp_c BETWEEN -30.00 AND 70.00),
  CONSTRAINT sensor_readings_spo2_check
    CHECK (spo2_percent IS NULL OR spo2_percent BETWEEN 0.00 AND 100.00),
  CONSTRAINT sensor_readings_heart_rate_check
    CHECK (heart_rate_bpm IS NULL OR heart_rate_bpm BETWEEN 20 AND 240),
  CONSTRAINT sensor_readings_signal_quality_check
    CHECK (signal_quality IS NULL OR signal_quality BETWEEN 0 AND 100)
);

CREATE TABLE ppg_samples (
  reading_id UUID NOT NULL REFERENCES sensor_readings(id) ON DELETE CASCADE,
  sample_index INTEGER NOT NULL,
  captured_offset_ms INTEGER,
  sample_value INTEGER NOT NULL,
  PRIMARY KEY (reading_id, sample_index),
  CONSTRAINT ppg_samples_index_check
    CHECK (sample_index >= 0),
  CONSTRAINT ppg_samples_offset_check
    CHECK (captured_offset_ms IS NULL OR captured_offset_ms >= 0)
);

CREATE TABLE motion_samples (
  reading_id UUID NOT NULL REFERENCES sensor_readings(id) ON DELETE CASCADE,
  sample_index INTEGER NOT NULL,
  captured_offset_ms INTEGER,
  accel_x NUMERIC(10, 5) NOT NULL,
  accel_y NUMERIC(10, 5) NOT NULL,
  accel_z NUMERIC(10, 5) NOT NULL,
  gyro_x NUMERIC(10, 5) NOT NULL,
  gyro_y NUMERIC(10, 5) NOT NULL,
  gyro_z NUMERIC(10, 5) NOT NULL,
  PRIMARY KEY (reading_id, sample_index),
  CONSTRAINT motion_samples_index_check
    CHECK (sample_index >= 0),
  CONSTRAINT motion_samples_offset_check
    CHECK (captured_offset_ms IS NULL OR captured_offset_ms >= 0)
);

CREATE TABLE health_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  observed_on DATE,
  resolved_on DATE,
  provider_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_history_entries_type_check
    CHECK (
      entry_type IN (
        'condition',
        'allergy',
        'medication',
        'surgery',
        'family_history',
        'immunization',
        'note'
      )
    ),
  CONSTRAINT health_history_entries_date_check
    CHECK (
      resolved_on IS NULL OR
      observed_on IS NULL OR
      resolved_on >= observed_on
    )
);

CREATE TABLE user_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  created_by TEXT NOT NULL DEFAULT 'system',
  related_health_entry_id UUID REFERENCES health_history_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT user_records_visibility_check
    CHECK (visibility IN ('private', 'care_team', 'system')),
  CONSTRAINT user_records_created_by_check
    CHECK (created_by IN ('user', 'system', 'clinician')),
  CONSTRAINT user_records_content_type_check
    CHECK (jsonb_typeof(content) IN ('object', 'array'))
);

CREATE INDEX user_login_events_user_logged_in_idx
  ON user_login_events (user_id, logged_in_at DESC);

CREATE INDEX devices_user_id_idx
  ON devices (user_id);

CREATE INDEX sensor_readings_user_captured_idx
  ON sensor_readings (user_id, captured_at DESC);

CREATE INDEX sensor_readings_device_captured_idx
  ON sensor_readings (device_id, captured_at DESC);

CREATE INDEX health_history_entries_user_type_idx
  ON health_history_entries (user_id, entry_type, observed_on DESC);

CREATE INDEX health_history_entries_details_gin_idx
  ON health_history_entries
  USING GIN (details);

CREATE INDEX user_records_user_type_idx
  ON user_records (user_id, record_type, created_at DESC);

CREATE INDEX user_records_content_gin_idx
  ON user_records
  USING GIN (content);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER devices_set_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER health_history_entries_set_updated_at
BEFORE UPDATE ON health_history_entries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_records_set_updated_at
BEFORE UPDATE ON user_records
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
