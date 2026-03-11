CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX auth_sessions_user_expires_idx
  ON auth_sessions (user_id, expires_at DESC);

CREATE TABLE ble_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'browser_ble',
  notes TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ble_capture_sessions_status_check
    CHECK (status IN ('active', 'completed', 'failed')),
  CONSTRAINT ble_capture_sessions_device_user_fk
    FOREIGN KEY (device_id, user_id)
    REFERENCES devices(id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX ble_capture_sessions_user_started_idx
  ON ble_capture_sessions (user_id, started_at DESC);

CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_threads_device_user_fk
    FOREIGN KEY (device_id, user_id)
    REFERENCES devices(id, user_id)
    ON DELETE SET NULL
);

CREATE INDEX chat_threads_user_updated_idx
  ON chat_threads (user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chat_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX chat_messages_thread_created_idx
  ON chat_messages (thread_id, created_at ASC);

CREATE TABLE ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_runs_status_check
    CHECK (status IN ('started', 'completed', 'failed'))
);

CREATE INDEX ai_runs_thread_created_idx
  ON ai_runs (thread_id, created_at DESC);
