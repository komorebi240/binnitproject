-- Phase 38: CRM datasets. A dataset is a table of customer records a company keeps for one source (Facebook leads, an
-- event list, an Excel sheet...). Its columns are defined per dataset; each row's values are one JSON object encrypted with
-- the company's own key (data), so the database never holds a customer's details in the clear. email_hash / phone_hash are
-- keyed hashes (HMAC) of the normalised values of the dataset's first EMAIL / PHONE column: they let the server find
-- duplicates without decrypting every row, and cannot be reversed without the company's key.

CREATE TABLE crm_datasets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    name NVARCHAR(200) NOT NULL,
    source_type VARCHAR(30) NOT NULL,
    description NVARCHAR(500) NULL,
    -- NULL = visible to executives only; otherwise that department's people can use the dataset.
    department_id BIGINT NULL REFERENCES departments(id),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_crm_datasets_source_type
        CHECK (source_type IN ('FACEBOOK', 'ZALO', 'WEBSITE', 'EXCEL', 'EVENT', 'REFERRAL', 'OTHER'))
);

CREATE INDEX idx_crm_datasets_company ON crm_datasets (company_id, is_deleted);

CREATE TABLE crm_columns (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES crm_datasets(id),
    name NVARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL,
    position INT NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT ck_crm_columns_data_type CHECK (data_type IN ('TEXT', 'NUMBER', 'DATE', 'EMAIL', 'PHONE'))
);

CREATE INDEX idx_crm_columns_dataset ON crm_columns (dataset_id, is_deleted);

CREATE TABLE crm_rows (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES crm_datasets(id),
    company_id BIGINT NOT NULL REFERENCES companies(id),
    data NVARCHAR(MAX) NOT NULL,
    email_hash VARCHAR(64) NULL,
    phone_hash VARCHAR(64) NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL
);

-- Rows are really deleted (not flagged): a customer's data must be gone when its owner removes it. The audit log keeps
-- the fact that a deletion happened, as a count.
CREATE INDEX idx_crm_rows_dataset ON crm_rows (dataset_id, id);
-- One customer per email within a dataset, enforced here as well as in the service (two imports at once).
CREATE UNIQUE INDEX ux_crm_rows_dataset_email ON crm_rows (dataset_id, email_hash) WHERE email_hash IS NOT NULL;

-- Who imported, exported or deleted what, and when. Holds counts and ids only - never a customer's details.
CREATE TABLE crm_audit_log (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(30) NOT NULL,
    dataset_id BIGINT NULL,
    detail NVARCHAR(500) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_crm_audit_log_company ON crm_audit_log (company_id, created_at DESC);
