-- Phase 21: self-service company registration (email OTP), staff invitations, first-run onboarding flag,
-- company contact email + logo.

ALTER TABLE companies ADD contact_email NVARCHAR(200) NULL;
ALTER TABLE companies ADD logo_path VARCHAR(300) NULL;

-- Existing users are treated as already onboarded (DEFAULT 1 backfills them); the application inserts
-- new users with 0 so they see the guided tour once.
ALTER TABLE users ADD onboarding_completed BIT NOT NULL CONSTRAINT df_users_onboarding_completed DEFAULT 1;

-- One row per "send me a registration code" request. otp_hash/token_hash are SHA-256 hex; the plain
-- OTP and the plain verification token are never stored.
CREATE TABLE registration_verifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(200) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    expires_at DATETIMEOFFSET(6) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    verified BIT NOT NULL DEFAULT 0,
    token_hash VARCHAR(64) NULL,
    consumed BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_registration_verifications_email ON registration_verifications (email);
CREATE UNIQUE INDEX uq_registration_verifications_token_hash
    ON registration_verifications (token_hash) WHERE token_hash IS NOT NULL;

-- Staff invitations. Company, level and department/team come from this row when the invitee accepts,
-- never from the client at accept time.
CREATE TABLE invitations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    email NVARCHAR(200) NOT NULL,
    authority_level VARCHAR(20) NOT NULL,
    department_id BIGINT NULL REFERENCES departments(id),
    team_id BIGINT NULL REFERENCES teams(id),
    title NVARCHAR(100) NULL,
    invited_by_user_id BIGINT NOT NULL REFERENCES users(id),
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIMEOFFSET(6) NOT NULL,
    status VARCHAR(20) NOT NULL,
    accepted_user_id BIGINT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE UNIQUE INDEX uq_invitations_token_hash ON invitations (token_hash);
CREATE INDEX idx_invitations_company_id ON invitations (company_id);
