-- Descriptive incentive tiers (Phase 5 plan) — a label only, deliberately NOT a monetary
-- amount, so no real compensation data lives in this system yet (CLAUDE.md section 7).
-- EXECUTIVE replaces the whole list at once (delete-all-then-insert in the service layer)
-- rather than the app diffing individual add/edit/remove/reorder operations.

CREATE TABLE kpi_incentive_tiers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    min_score INT NOT NULL,
    label NVARCHAR(200) NOT NULL,
    sort_order INT NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT ck_kpi_incentive_tiers_min_score CHECK (min_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_kpi_incentive_tiers_company_id ON kpi_incentive_tiers (company_id);
