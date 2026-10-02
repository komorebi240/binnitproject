-- One KPI formula per company (Phase 5 plan): completion_weight in [0,1], the on-time weight is
-- always (1 - completion_weight) so the two always sum to 1 without storing a redundant column.
-- EXECUTIVE-only to write; readable by anyone in the company (transparency of the formula).

CREATE TABLE kpi_configs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL UNIQUE REFERENCES companies(id),
    completion_weight FLOAT NOT NULL DEFAULT 0.7,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    CONSTRAINT ck_kpi_configs_weight_range CHECK (completion_weight >= 0 AND completion_weight <= 1)
);
