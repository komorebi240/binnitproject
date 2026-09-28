-- Cross-department requests for access to a catalog folder. Approval is granted to the
-- requester's own connected Google account specifically (Drive permissions are per-email, not
-- per-department) — see the Phase 3 plan.
CREATE TABLE folder_access_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    catalog_folder_id BIGINT NOT NULL REFERENCES department_drive_folders(id),
    requester_user_id BIGINT NOT NULL REFERENCES users(id),
    requester_department_id BIGINT NOT NULL REFERENCES departments(id),
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    decided_by_user_id BIGINT NULL REFERENCES users(id),
    decided_at DATETIMEOFFSET(6) NULL,
    note NVARCHAR(1000) NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,

    CONSTRAINT ck_folder_access_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX idx_folder_access_requests_company_id ON folder_access_requests (company_id);
CREATE INDEX idx_folder_access_requests_catalog_folder_id ON folder_access_requests (catalog_folder_id);
CREATE INDEX idx_folder_access_requests_requester_department_id ON folder_access_requests (requester_department_id);
CREATE INDEX idx_folder_access_requests_status ON folder_access_requests (status);
