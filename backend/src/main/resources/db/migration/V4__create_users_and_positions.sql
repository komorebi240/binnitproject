-- Users belong to exactly one company (the tenant boundary). Their "position" — the actual
-- authority level and org placement — is a separate, filterable-history table so it can
-- change without rewriting the user row. See CLAUDE.md section 46.3 and the plan's decision
-- log for why authority level lives here instead of a fixed 2-role column.

CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    username NVARCHAR(100) NOT NULL,
    password_hash NVARCHAR(200) NOT NULL,
    full_name NVARCHAR(200) NOT NULL,
    email NVARCHAR(200) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

-- Username is looked up at login before the caller's company is known, so it must be
-- globally unique, not just unique within a company.
CREATE UNIQUE INDEX ux_users_username ON users (username);
CREATE INDEX idx_users_company_id ON users (company_id);

CREATE TABLE positions (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    department_id BIGINT NULL REFERENCES departments(id),
    team_id BIGINT NULL REFERENCES teams(id),
    authority_level NVARCHAR(30) NOT NULL,
    title NVARCHAR(100) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_positions_authority_level
        CHECK (authority_level IN ('EXECUTIVE', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE')),
    -- Org placement must match the authority level: EXECUTIVE is company-wide (no
    -- department/team), DEPARTMENT_HEAD needs a department, TEAM_LEAD needs both (department
    -- is redundant with the team's own department, but kept explicit so "list everyone in
    -- department X" is a single WHERE clause, not a join through teams), EMPLOYEE needs at
    -- least a department. Enforced here, not just in application code (CLAUDE.md section 6).
    CONSTRAINT ck_positions_scope_matches_level CHECK (
        (authority_level = 'EXECUTIVE' AND department_id IS NULL AND team_id IS NULL)
        OR (authority_level = 'DEPARTMENT_HEAD' AND department_id IS NOT NULL AND team_id IS NULL)
        OR (authority_level = 'TEAM_LEAD' AND department_id IS NOT NULL AND team_id IS NOT NULL)
        OR (authority_level = 'EMPLOYEE' AND department_id IS NOT NULL)
    )
);

CREATE INDEX idx_positions_department_id ON positions (department_id);
CREATE INDEX idx_positions_team_id ON positions (team_id);

-- One active position per user at a time (see plan: multi-position support is deferred).
CREATE UNIQUE INDEX ux_positions_active_user ON positions (user_id) WHERE is_deleted = 0;
