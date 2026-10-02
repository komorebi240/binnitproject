-- Phase 20: task attachments (files on disk, validated like chat attachments) and an optional Drive link.
-- The link is validated in the service (https, Google Drive/Docs hosts only); the column just holds it.

ALTER TABLE tasks ADD drive_url NVARCHAR(500) NULL;

CREATE TABLE task_attachments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(id),
    stored_name VARCHAR(100) NOT NULL,
    original_name NVARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_image BIT NOT NULL,
    uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments (task_id);
