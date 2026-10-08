package com.company.project.modules.identity.service;

import com.company.project.security.UserPrincipal;

import java.util.Optional;

/**
 * Sign-ins kept on the server, so that signing out, changing the password or deactivating an account takes effect at once
 * and "nothing done for two hours" can be decided by the server rather than trusted from the browser. Callers hold only the
 * random token that goes into the cookie; the server stores its hash.
 */
public interface SessionService {

    /** Starts a session for a person who has just proved who they are; returns the token for the cookie. */
    String start(Long userId);

    /**
     * The person behind a live session, read fresh from the database (so a changed position or a deactivated account is
     * seen); empty when the token matches no live session or the account can no longer sign in.
     */
    Optional<UserPrincipal> resume(String token);

    /** Notes that the person did something. False when the token matches no live session. */
    boolean recordActivity(String token);

    /** Ends one session (sign-out). Unknown or blank tokens are ignored. */
    void end(String token);

    /** Ends every session of the user (password reset, account deactivated or deleted). */
    void endAll(Long userId);

    /** Ends the user's other sessions and keeps the one with {@code keepToken} (password change). A blank token ends all. */
    void endOthers(Long userId, String keepToken);
}
