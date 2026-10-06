-- Phase 27: a manager changes a staff member's email only after a code sent to the NEW address is confirmed.
-- otp_hash is SHA-256 hex; the plain code is never stored.
CREATE TABLE email_change_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    new_email NVARCHAR(200) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    expires_at DATETIMEOFFSET(6) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    consumed BIT NOT NULL DEFAULT 0,
    requested_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_email_change_requests_user_id ON email_change_requests (user_id);
