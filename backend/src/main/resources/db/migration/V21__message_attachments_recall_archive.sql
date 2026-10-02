-- Phase 18: chat attachments, message recall, per-user conversation archive.

-- A recalled message keeps its row (so both sides still see "da thu hoi" in order) but its body
-- is blanked and its attachment rows/files are removed by the service.
ALTER TABLE messages ADD recalled_at DATETIMEOFFSET(6) NULL;

CREATE TABLE message_attachments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id),
    stored_name VARCHAR(100) NOT NULL,
    original_name NVARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_image BIT NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_message_attachments_message_id ON message_attachments (message_id);

-- One row = this user has hidden their conversation with other_user_id (it does not affect the
-- other side). A new incoming message removes the row so nothing is silently missed.
CREATE TABLE message_archives (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    other_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_message_archives_pair UNIQUE (user_id, other_user_id)
);
