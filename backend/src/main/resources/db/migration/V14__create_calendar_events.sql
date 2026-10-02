-- Each row belongs to exactly one person's calendar (user_id) — deliberately private (Phase 6
-- plan): only that user can ever list/read their own calendar_events, even their manager who
-- may have created the row. created_by_user_id is kept for audit/display ("who added this")
-- but is never a basis for granting read access.

CREATE TABLE calendar_events (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NULL,
    event_type NVARCHAR(20) NOT NULL,
    start_at DATETIMEOFFSET(6) NOT NULL,
    end_at DATETIMEOFFSET(6) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_calendar_events_type CHECK (event_type IN ('MEETING', 'DEADLINE', 'BUSINESS_TRIP', 'OTHER')),
    CONSTRAINT ck_calendar_events_status CHECK (status IN ('CONFIRMED', 'PENDING', 'DECLINED'))
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events (user_id);
