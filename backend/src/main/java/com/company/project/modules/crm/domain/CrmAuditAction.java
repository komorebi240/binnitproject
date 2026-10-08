package com.company.project.modules.crm.domain;

/** The actions the CRM audit log records: the ones that create, move or destroy data in bulk. */
public enum CrmAuditAction {
    DATASET_CREATED,
    DATASET_UPDATED,
    DATASET_DELETED,
    COLUMN_ADDED,
    COLUMN_RENAMED,
    COLUMN_DELETED,
    ROW_DELETED,
    IMPORT,
    EXPORT
}
