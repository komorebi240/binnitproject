package com.company.project.modules.onboarding.dto.response;

import com.company.project.common.AuthorityLevel;

/** What the accept page shows before the invitee commits: no ids, nothing about other users. */
public record InvitationPreviewResponse(String email, String companyName, AuthorityLevel authorityLevel, String inviterName) {
}
