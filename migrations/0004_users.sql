PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id              INTEGER PRIMARY KEY,
  identifier_hash TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  venue_id        INTEGER REFERENCES venues(id) ON DELETE SET NULL,
  session_version INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_users_single_admin ON users (role) WHERE role = 'admin';
CREATE INDEX idx_users_venue ON users (venue_id);

-- The built-in admin account. Its identifier hash is set from ADMIN_IDENTIFIER
-- on the first successful admin login.
INSERT INTO users (identifier_hash, name, role, venue_id)
VALUES ('', 'مدیر', 'admin', NULL);
