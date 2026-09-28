-- Task assignment (Phase 2). A task's target is either a specific user or an entire
-- department acting as a shared queue — see the Phase 2 plan for why there is no
-- team-level target and no separate "in progress" status yet.
CREATE TABLE tasks (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    assignee_type NVARCHAR(20) NOT NULL,
    assignee_user_id BIGINT NULL REFERENCES users(id),
    assignee_department_id BIGINT NULL REFERENCES departments(id),
    assigned_by_user_id BIGINT NOT NULL REFERENCES users(id),
    status NVARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
    priority NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    due_date DATE NULL,
    decided_at DATETIMEOFFSET(6) NULL,
    completed_at DATETIMEOFFSET(6) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,

    CONSTRAINT ck_tasks_assignee_type CHECK (assignee_type IN ('USER', 'DEPARTMENT')),
    CONSTRAINT ck_tasks_status
        CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'DECLINED', 'DONE', 'CANCELLED')),
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    -- Exactly one of assignee_user_id / assignee_department_id, matching assignee_type
    -- (CLAUDE.md section 6 — DB-level constraints for important business rules).
    CONSTRAINT ck_tasks_assignee_matches_type CHECK (
        (assignee_type = 'USER' AND assignee_user_id IS NOT NULL AND assignee_department_id IS NULL)
        OR (assignee_type = 'DEPARTMENT' AND assignee_department_id IS NOT NULL AND assignee_user_id IS NULL)
    )
);

CREATE INDEX idx_tasks_company_id ON tasks (company_id);
CREATE INDEX idx_tasks_assignee_user_id ON tasks (assignee_user_id);
CREATE INDEX idx_tasks_assignee_department_id ON tasks (assignee_department_id);
CREATE INDEX idx_tasks_assigned_by_user_id ON tasks (assigned_by_user_id);
CREATE INDEX idx_tasks_status ON tasks (status);
