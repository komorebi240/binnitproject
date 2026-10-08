package com.company.project.modules.crm.dto.request;

/** What an import does with a customer that already exists in the dataset (same email or phone). */
public enum DuplicatePolicy {
    /** Leave the existing customer as it is. */
    SKIP,
    /** Fill the existing customer with the values the file has (blank cells in the file change nothing). */
    UPDATE
}
