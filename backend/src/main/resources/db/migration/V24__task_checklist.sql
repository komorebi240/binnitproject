-- Phase 27: checklist items on a task. When every item is ticked the task completes itself.
CREATE TABLE task_checklist_items (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id),
    text NVARCHAR(200) NOT NULL,
    is_done BIT NOT NULL DEFAULT 0,
    done_by_user_id BIGINT NULL REFERENCES users(id),
    done_at DATETIMEOFFSET(6) NULL,
    sort_order INT NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_task_checklist_items_task_id ON task_checklist_items (task_id, sort_order);
