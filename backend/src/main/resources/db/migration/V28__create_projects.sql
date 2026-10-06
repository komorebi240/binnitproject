-- Phase 28 (wave 3): cross-department projects. An owning department invites other departments to help;
-- once a department accepts, its head chooses which people join. Members share the project's tasks, chat
-- and Drive folders (folders come from the existing department Drive catalog).

CREATE TABLE projects (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NULL,
    owner_department_id BIGINT NOT NULL REFERENCES departments(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_projects_company_id ON projects (company_id);
CREATE INDEX idx_projects_owner_department_id ON projects (owner_department_id);

CREATE TABLE project_departments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    department_id BIGINT NOT NULL REFERENCES departments(id),
    role NVARCHAR(20) NOT NULL,
    status NVARCHAR(20) NOT NULL,
    invited_by_user_id BIGINT NOT NULL REFERENCES users(id),
    note NVARCHAR(500) NULL,
    decided_by_user_id BIGINT NULL REFERENCES users(id),
    decided_at DATETIMEOFFSET(6) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,

    CONSTRAINT ck_project_departments_role CHECK (role IN ('OWNER', 'SUPPORT')),
    CONSTRAINT ck_project_departments_status CHECK (status IN ('INVITED', 'ACCEPTED', 'DECLINED'))
);

CREATE INDEX idx_project_departments_project_id ON project_departments (project_id);
CREATE INDEX idx_project_departments_department_id ON project_departments (department_id);
CREATE UNIQUE INDEX ux_project_departments_active ON project_departments (project_id, department_id) WHERE is_deleted = 0;

CREATE TABLE project_members (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    department_id BIGINT NULL REFERENCES departments(id),
    added_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_members_project_id ON project_members (project_id);
CREATE INDEX idx_project_members_user_id ON project_members (user_id);
CREATE UNIQUE INDEX ux_project_members_active ON project_members (project_id, user_id) WHERE is_deleted = 0;

CREATE TABLE project_folders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    catalog_folder_id BIGINT NOT NULL REFERENCES department_drive_folders(id),
    linked_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_folders_project_id ON project_folders (project_id);
CREATE UNIQUE INDEX ux_project_folders_active ON project_folders (project_id, catalog_folder_id) WHERE is_deleted = 0;

CREATE TABLE project_messages (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    sender_id BIGINT NOT NULL REFERENCES users(id),
    body NVARCHAR(2000) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_project_messages_project_id ON project_messages (project_id, id);

ALTER TABLE tasks ADD project_id BIGINT NULL REFERENCES projects(id);
CREATE INDEX idx_tasks_project_id ON tasks (project_id);
