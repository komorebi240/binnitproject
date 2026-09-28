-- Each user connects their own Google Drive (Phase 3 plan) — no company-wide shared account.
-- refresh_token is stored AES/GCM-encrypted by the application (TokenEncryptionService), never
-- in plaintext (CLAUDE.md section 7).
CREATE TABLE google_drive_connections (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    google_email NVARCHAR(200) NOT NULL,
    refresh_token_encrypted NVARCHAR(MAX) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

-- One active connection per user.
CREATE UNIQUE INDEX ux_drive_connections_active_user ON google_drive_connections (user_id) WHERE is_deleted = 0;

-- Short-lived CSRF correlation for the OAuth redirect round trip (created by /drive/connect,
-- consumed by /drive/oauth2/callback, checked against a TTL in application code — not a
-- business table, so no audit columns).
CREATE TABLE oauth_states (
    state NVARCHAR(100) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
