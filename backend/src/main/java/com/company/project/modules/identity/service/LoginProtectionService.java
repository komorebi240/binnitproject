package com.company.project.modules.identity.service;

/**
 * Brute-force protection for sign-in (CLAUDE.md section 8). Only FAILED attempts count. Limits apply per username (whether
 * or not that account exists, so a "too many attempts" answer never tells an attacker a username is real) and per client
 * address (so one address cannot spray many usernames). Failures of existing accounts are also kept in the database, so a
 * restart does not reset them.
 */
public interface LoginProtectionService {

    /** Throws 429 TOO_MANY_REQUESTS when this username or this address may not try a password right now. */
    void checkAllowed(String username, String clientAddress);

    void recordFailure(String username, String clientAddress);

    /** After a successful sign-in or a password reset the account starts clean; the address keeps its count. */
    void clearFailures(String username);
}
