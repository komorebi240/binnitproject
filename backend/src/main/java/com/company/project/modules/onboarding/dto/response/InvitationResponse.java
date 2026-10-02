package com.company.project.modules.onboarding.dto.response;

import com.company.project.common.AuthorityLevel;

import java.time.Instant;

/** Never contains the token - it only ever travels inside the email link. */
public record InvitationResponse(
        Long id,
        String email,
        AuthorityLevel authorityLevel,
        Long departmentId,
        String departmentName,
        Long teamId,
        String teamName,
        String title,
        String invitedByName,
        Instant createdAt,
        Instant expiresAt,
        boolean expired
) {
}
