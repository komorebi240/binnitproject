-- Reference migration for the sample module. Copy this pattern (audit columns, soft delete,
-- explicit index) for real feature tables — see CLAUDE.md section 46.3.
--
-- Audit columns are DATETIMEOFFSET, not DATETIME2: Hibernate 6's SQL Server dialect maps
-- java.time.Instant to TIMESTAMP_UTC, which validates against datetimeoffset(6) — a
-- DATETIME2 column fails Hibernate's schema validation at startup with a type mismatch.
CREATE TABLE samples (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(2000) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_samples_is_deleted ON samples (is_deleted);
