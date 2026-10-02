-- Persisted, per-user notifications (Phase 6 plan) — a badge/unread-count needs a durable row,
-- not just a transient toast. related_entity_type/id let the frontend deep-link (e.g. a
-- CALENDAR_EVENT_INVITE notification points at the calendar_events row) without a hard FK,
-- since this table is meant to stay generic across future notification sources.

CREATE TABLE notifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    body NVARCHAR(1000) NULL,
    related_entity_type NVARCHAR(50) NULL,
    related_entity_id BIGINT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
