-- Phase 43: whiteboards. A board belongs to one company and one owner, who can share it with colleagues as EDITOR or
-- VIEWER (whiteboard_members). The drawing is the Excalidraw element list as JSON (images are not allowed, so it stays
-- small; the service caps it). `version` is bumped on every save: a save must name the version it started from, so two
-- people editing at once never overwrite each other blindly - the second one merges and saves again.
CREATE TABLE whiteboards (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    owner_id BIGINT NOT NULL REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    scene NVARCHAR(MAX) NOT NULL,
    scene_bytes INT NOT NULL,
    version INT NOT NULL,
    updated_by_user_id BIGINT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_whiteboards_scene_bytes CHECK (scene_bytes >= 0)
);

CREATE INDEX idx_whiteboards_owner ON whiteboards (owner_id, is_deleted);
CREATE INDEX idx_whiteboards_company ON whiteboards (company_id);

CREATE TABLE whiteboard_members (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    whiteboard_id BIGINT NOT NULL REFERENCES whiteboards(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    role VARCHAR(10) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    CONSTRAINT uq_whiteboard_members UNIQUE (whiteboard_id, user_id),
    CONSTRAINT ck_whiteboard_members_role CHECK (role IN ('EDITOR', 'VIEWER'))
);

CREATE INDEX idx_whiteboard_members_user ON whiteboard_members (user_id);
