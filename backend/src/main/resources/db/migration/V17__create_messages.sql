-- Simple 1-1 internal chat (Phase 7 plan) — no conversation/group concept, a thread between two
-- users is just every row where (sender, recipient) matches either direction. Polling-based on
-- the frontend, not real-time, so no extra infra beyond this table is needed yet.

CREATE TABLE messages (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id),
    recipient_id BIGINT NOT NULL REFERENCES users(id),
    body NVARCHAR(2000) NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_recipient_id ON messages (recipient_id);
