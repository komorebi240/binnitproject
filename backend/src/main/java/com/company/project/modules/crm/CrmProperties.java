package com.company.project.modules.crm;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bound from {@code app.crm.*}. The data key is a secret and has no default (CLAUDE.md section 30): the application
 * refuses to start without it instead of storing customer data under a guessable key.
 *
 * @param dataKey          Base64 of 32 random bytes; every company's own keys are derived from it
 * @param maxImportRows    data rows one import may contain
 * @param maxImportBytes   size of an uploaded file
 * @param maxRowsPerDataset rows one dataset may hold
 * @param maxColumns       columns one dataset may have
 * @param exportMaxRows    rows one export file may contain
 */
@ConfigurationProperties(prefix = "app.crm")
public record CrmProperties(
        String dataKey,
        int maxImportRows,
        long maxImportBytes,
        int maxRowsPerDataset,
        int maxColumns,
        int exportMaxRows
) {
}
