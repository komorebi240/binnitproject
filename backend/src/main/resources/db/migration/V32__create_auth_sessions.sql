-- Phase 39: sign-in sessions kept on the server. The browser holds only a random token (httpOnly cookie); this table holds its
-- SHA-256 hash, so a leaked table cannot be replayed as a cookie. A session ends when its row is deleted (sign-out, password
-- change or reset, account deactivated), when nothing was done for the idle timeout, or at its absolute expiry.
CREATE TABLE auth_sessions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    token_hash VARCHAR(64) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    last_activity_at DATETIMEOFFSET(6) NOT NULL,
    expires_at DATETIMEOFFSET(6) NOT NULL,
    CONSTRAINT uq_auth_sessions_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
