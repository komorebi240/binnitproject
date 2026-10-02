-- Fully private per-user notes (Phase 6 plan) — no sharing concept at all yet; every service
-- method filters by user_id = caller, and a wrong/foreign id reads as 404, not 403, hiding
-- whether the note even exists (consistent with cross-tenant handling elsewhere in this app).

CREATE TABLE notes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(MAX) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_notes_user_id ON notes (user_id);
