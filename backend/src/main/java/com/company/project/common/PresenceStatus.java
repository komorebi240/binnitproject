package com.company.project.common;

/**
 * Self-reported availability, shown as a colored dot on a user's avatar everywhere one appears
 * (department/team directory, messages). Purely informational - it never gates whether a
 * notification is actually created (that stays NotificationService's job); {@code LIMITED} and
 * {@code DO_NOT_DISTURB} are a signal to other users, not a server-side delivery filter, since
 * suppressing real notifications based on a self-reported status the user could forget to reset
 * would risk losing something genuinely important.
 */
public enum PresenceStatus {
    ONLINE,
    LIMITED,
    DO_NOT_DISTURB
}
