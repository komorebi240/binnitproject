package com.company.project.modules.onboarding.domain;

import com.company.project.common.AuthorityLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** An invitation to join a company at a fixed level/department/team; only the SHA-256 of the link token is stored. */
@Entity
@Table(name = "invitations")
public class InvitationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 200)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "authority_level", nullable = false, length = 20)
    private AuthorityLevel authorityLevel;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "team_id")
    private Long teamId;

    @Column(length = 100)
    private String title;

    @Column(name = "invited_by_user_id", nullable = false)
    private Long invitedByUserId;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "accepted_user_id")
    private Long acceptedUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InvitationEntity() {
        // JPA
    }

    public InvitationEntity(
            Long companyId, String email, AuthorityLevel authorityLevel, Long departmentId, Long teamId,
            String title, Long invitedByUserId, String tokenHash, Instant expiresAt) {
        this.companyId = companyId;
        this.email = email;
        this.authorityLevel = authorityLevel;
        this.departmentId = departmentId;
        this.teamId = teamId;
        this.title = title;
        this.invitedByUserId = invitedByUserId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getEmail() {
        return email;
    }

    public AuthorityLevel getAuthorityLevel() {
        return authorityLevel;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public Long getTeamId() {
        return teamId;
    }

    public String getTitle() {
        return title;
    }

    public Long getInvitedByUserId() {
        return invitedByUserId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public InvitationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isUsable(Instant now) {
        return status == InvitationStatus.PENDING && expiresAt.isAfter(now);
    }

    /** Issues a fresh link: the old token stops working because only the new hash is kept. */
    public void reissue(String newTokenHash, Instant newExpiresAt) {
        this.tokenHash = newTokenHash;
        this.expiresAt = newExpiresAt;
    }

    public void revoke() {
        this.status = InvitationStatus.REVOKED;
    }

    public void accept(Long userId) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedUserId = userId;
    }
}
