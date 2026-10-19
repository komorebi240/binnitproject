-- Phase 44: "Clear all" under Completed / Cancelled tasks hides those tasks from the lists of the person who cleared
-- them, and nobody else. The task, everyone else's view of it, its history and the KPI that counts it stay as they are.
-- A row is removed by "Undo", and for everyone when a cancelled task is restored (it is no longer finished).
CREATE TABLE hidden_tasks (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    CONSTRAINT uq_hidden_tasks UNIQUE (user_id, task_id)
);

CREATE INDEX idx_hidden_tasks_task ON hidden_tasks (task_id);
