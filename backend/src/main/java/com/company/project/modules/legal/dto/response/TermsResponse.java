package com.company.project.modules.legal.dto.response;

import java.time.Instant;

/**
 * The newest terms of service in one language. {@code content} is plain text: lines starting with {@code "## "} are
 * section headings, lines starting with {@code "- "} are list items, anything else is a paragraph.
 */
public record TermsResponse(
        int version,
        Instant publishedAt,
        String language,
        String title,
        String content
) {
}
