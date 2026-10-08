package com.company.project.modules.crm.service;

import com.company.project.modules.crm.dto.request.ImportOptions;
import com.company.project.modules.crm.dto.response.ImportPreviewResponse;
import com.company.project.modules.crm.dto.response.ImportResultResponse;
import com.company.project.security.UserPrincipal;

/** Reading customers from an Excel, CSV or Word file into a dataset, in two steps: look at the file, then import it. */
public interface CrmImportService {

    /** What the file holds (its tables, their columns and first rows). Nothing is saved. */
    ImportPreviewResponse preview(String fileName, byte[] content, UserPrincipal caller);

    /**
     * Imports one table of the file into the dataset using the column mapping. Cells that do not fit their column refuse
     * their row (the rest still import); customers already in the dataset (same email or phone) are skipped or updated
     * according to {@code options}. All or nothing for the database: a failure leaves the dataset as it was.
     */
    ImportResultResponse importInto(Long datasetId, String fileName, byte[] content, ImportOptions options, UserPrincipal caller);
}
