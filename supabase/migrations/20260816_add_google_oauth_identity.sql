-- Link a PassExam account to one external identity without changing its
-- password credentials or any existing profile/application data.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_identity
  ON users (auth_provider, auth_provider_id)
  WHERE auth_provider IS NOT NULL AND auth_provider_id IS NOT NULL;
