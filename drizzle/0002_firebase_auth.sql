ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  ADD COLUMN firebase_uid TEXT,
  ADD COLUMN auth_provider TEXT,
  ADD COLUMN avatar_url TEXT,
  ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX users_firebase_uid_uidx
  ON users (firebase_uid)
  WHERE firebase_uid IS NOT NULL;
