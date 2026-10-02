-- One-time codes for the "forgot password" flow. Only the SHA-256 hash of the OTP is stored,
-- never the OTP itself (CLAUDE.md section 7 — treat it like any other short-lived credential).
-- A request always creates a new row; the service layer invalidates any earlier unused row for
-- the same user before inserting this one (see AuthServiceImpl.requestPasswordReset).

CREATE TABLE password_reset_otps (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    otp_hash NVARCHAR(64) NOT NULL,
    expires_at DATETIMEOFFSET(6) NOT NULL,
    used BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_password_reset_otps_user_id ON password_reset_otps (user_id);
