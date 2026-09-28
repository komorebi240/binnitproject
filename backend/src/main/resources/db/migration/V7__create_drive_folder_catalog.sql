-- A company-wide catalog of Drive folders each department has chosen to expose for cross-
-- department access requests. connection_user_id identifies whose Google Drive connection is
-- used to actually grant access later (that user must own or have share-rights on the folder).
CREATE TABLE department_drive_folders (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id),
    department_id BIGINT NOT NULL REFERENCES departments(id),
    connection_user_id BIGINT NOT NULL REFERENCES users(id),
    google_folder_id NVARCHAR(200) NOT NULL,
    google_folder_name NVARCHAR(300) NOT NULL,
    created_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    created_by NVARCHAR(100) NULL,
    updated_at DATETIMEOFFSET(6) NULL,
    updated_by NVARCHAR(100) NULL,
    is_deleted BIT NOT NULL DEFAULT 0
);

CREATE INDEX idx_department_drive_folders_company_id ON department_drive_folders (company_id);
CREATE INDEX idx_department_drive_folders_department_id ON department_drive_folders (department_id);

CREATE UNIQUE INDEX ux_department_drive_folders_active
    ON department_drive_folders (department_id, google_folder_id)
    WHERE is_deleted = 0;
