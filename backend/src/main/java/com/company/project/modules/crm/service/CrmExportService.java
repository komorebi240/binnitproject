package com.company.project.modules.crm.service;

import com.company.project.security.UserPrincipal;

public interface CrmExportService {

    /** An .xlsx file ready to download. */
    record ExportFile(String fileName, byte[] content) {
    }

    /**
     * Writes the whole dataset to an Excel file. Executives only (the customers leave the system here), limited in size,
     * and always recorded in the audit log.
     */
    ExportFile export(Long datasetId, UserPrincipal caller);
}
