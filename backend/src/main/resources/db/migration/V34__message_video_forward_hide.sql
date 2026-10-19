-- Phase 41: videos in 1-1 chat, forwarding, and "delete for me".

-- A video plays in the conversation, like an image shows; everything else stays a download.
ALTER TABLE message_attachments ADD is_video BIT NOT NULL CONSTRAINT df_message_attachments_is_video DEFAULT 0;

-- A forwarded copy shares the original's file (same stored_name) instead of duplicating it; a file is deleted only when
-- the last attachment row that names it is gone (see MessageServiceImpl.recallMessage).
CREATE INDEX idx_message_attachments_stored_name ON message_attachments (stored_name);

-- is_forwarded labels a copy "Forwarded". hidden_for_* is "delete for me": the message disappears for that participant
-- only; the other one still sees it (recalling stays the way to remove it for both).
ALTER TABLE messages ADD
    is_forwarded BIT NOT NULL CONSTRAINT df_messages_is_forwarded DEFAULT 0,
    hidden_for_sender BIT NOT NULL CONSTRAINT df_messages_hidden_for_sender DEFAULT 0,
    hidden_for_recipient BIT NOT NULL CONSTRAINT df_messages_hidden_for_recipient DEFAULT 0;
