package com.company.project.modules.onboarding.service;

import com.company.project.modules.onboarding.dto.request.AcceptInvitationRequest;
import com.company.project.modules.onboarding.dto.request.CreateInvitationRequest;
import com.company.project.modules.onboarding.dto.response.InvitationPreviewResponse;
import com.company.project.modules.onboarding.dto.response.InvitationResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

/**
 * Staff invitations by email. Creating one follows exactly the rules for creating a user directly
 * (who may grant which level where); accepting one takes the company, level and department/team
 * from the stored invitation, never from the request.
 */
public interface InvitationService {

    InvitationResponse create(CreateInvitationRequest request, UserPrincipal caller);

    /** Executives see every pending invitation of their company; everyone else only their own. */
    List<InvitationResponse> listPending(UserPrincipal caller);

    /** The inviter or an executive of the same company; anyone else gets a 404. */
    void revoke(Long invitationId, UserPrincipal caller);

    /** New link, new 7-day window; the previous link stops working. */
    InvitationResponse resend(Long invitationId, UserPrincipal caller);

    /** Public: what the accept page shows. Unknown, used, revoked and expired tokens are indistinguishable (404). */
    InvitationPreviewResponse preview(String token);

    /** Public: creates the account; returns its username (the controller signs the new user in). */
    String accept(String token, AcceptInvitationRequest request);
}
