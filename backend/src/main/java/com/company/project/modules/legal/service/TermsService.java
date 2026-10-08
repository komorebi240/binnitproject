package com.company.project.modules.legal.service;

import com.company.project.modules.legal.dto.response.TermsResponse;

public interface TermsService {

    /** The newest terms in {@code language} ("vi" or "en"; anything else is Vietnamese). Public: shown before sign-up. */
    TermsResponse getCurrent(String language);

    /** True when the user has accepted the newest version. */
    boolean hasAcceptedCurrent(Long userId);

    /** Records that the signed-in user accepted {@code version}; refused unless it is the newest. Repeating it is harmless. */
    void accept(Long userId, int version);

    /**
     * For a new account: refuses unless {@code acceptedVersion} is the newest version, so nobody can create an account
     * without having been shown the current terms. Call it before creating anything.
     */
    void requireCurrentVersion(Integer acceptedVersion);

    /** For a new account (after {@link #requireCurrentVersion}): records the acceptance made while signing up. */
    void recordAcceptance(Long userId, int version);
}
