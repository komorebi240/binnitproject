package com.company.project.modules.tasks.service;

import com.company.project.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

/**
 * A task's Drive link is rendered as a clickable link for other users, so it must be a plain
 * https link to Google Drive/Docs - never javascript:/data: URLs, other hosts, or URLs carrying
 * credentials (CLAUDE.md section 13, unsafe redirects/XSS).
 */
public final class DriveUrlPolicy {

    public static final int MAX_LENGTH = 500;
    private static final Set<String> ALLOWED_HOSTS = Set.of("drive.google.com", "docs.google.com");

    private DriveUrlPolicy() {
    }

    /** Returns the trimmed URL, or null for blank input (clears the link); throws 400 for anything not allowed. */
    public static String normalizeOrReject(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String candidate = raw.trim();
        if (candidate.length() > MAX_LENGTH) {
            throw invalid("Drive link must be at most " + MAX_LENGTH + " characters");
        }
        URI uri;
        try {
            uri = new URI(candidate);
        } catch (URISyntaxException e) {
            throw invalid("Drive link is not a valid URL");
        }
        String host = uri.getHost() == null ? null : uri.getHost().toLowerCase(Locale.ROOT);
        boolean ok = "https".equalsIgnoreCase(uri.getScheme())
                && host != null
                && ALLOWED_HOSTS.contains(host)
                && uri.getUserInfo() == null;
        if (!ok) {
            throw invalid("Drive link must be an https link to drive.google.com or docs.google.com");
        }
        return candidate;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException("INVALID_DRIVE_URL", message, HttpStatus.BAD_REQUEST);
    }
}
