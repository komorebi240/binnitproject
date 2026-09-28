-- Three-level org structure: Company -> Department -> Team (Team is optional; not every
-- department needs sub-teams). See CLAUDE.md section 46.3 for the audit-column/soft-delete
-- convention these tables follow.

CREATE TABLE companies (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE departments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    name NVARCHAR(200) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_departments_company_id ON departments (company_id);

-- A company cannot have two active departments with the same name.
CREATE UNIQUE INDEX ux_departments_company_name_active
    ON departments (company_id, name)
    WHERE is_deleted = 0;

CREATE TABLE teams (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES departments(id),
    name NVARCHAR(200) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_teams_department_id ON teams (department_id);

-- A department cannot have two active teams with the same name.
CREATE UNIQUE INDEX ux_teams_department_name_active
    ON teams (department_id, name)
    WHERE is_deleted = 0;
