package com.company.project.modules.identity.domain;

import com.company.project.common.PresenceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A login identity, fixed to one company (the tenant boundary). Org placement / authority
 * level is NOT here - see {@link PositionEntity}. Never expose {@code passwordHash} through
 * any response DTO (CLAUDE.md section 7).
 *
 * {@code email} doubles as the password-reset recovery address - see AuthService. There is no
 * separate "contact email" concept; scalable-enough for this project's size, revisit only if a
 * real requirement for distinct addresses appears (CLAUDE.md section 1 - avoid premature
 * abstraction).
 */
@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 200)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(length = 200)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "employee_code", length = 50)
    private String employeeCode;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "avatar_path", length = 300)
    private String avatarPath;

    @Enumerated(EnumType.STRING)
    @Column(name = "presence_status", nullable = false, length = 20)
    private PresenceStatus presenceStatus = PresenceStatus.ONLINE;

    /**
     * Marks the one or few "communications bot" accounts allowed to message any user in any
     * company (MessageServiceImpl's normal same-company check is bypassed when either party has
     * this flag) - see the Phase 14 plan. Deliberately has no public setter: it is never exposed
     * through any create/update API, only ever set directly in the database/seed data, so no
     * authenticated request can grant itself cross-tenant messaging power.
     */
    @Column(name = "is_system_account", nullable = false)
    private boolean systemAccount = false;

    /** False until the user finishes (or skips) the first-run guided tour; backfilled to true for pre-existing users by V23. */
    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    protected UserEntity() {
        // JPA
    }

    public UserEntity(Long companyId, String username, String passwordHash, String fullName, String email) {
        this.companyId = companyId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void completeOnboarding() {
        this.onboardingCompleted = true;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public String getAvatarPath() {
        return avatarPath;
    }

    public void setAvatarPath(String avatarPath) {
        this.avatarPath = avatarPath;
    }

    public PresenceStatus getPresenceStatus() {
        return presenceStatus;
    }

    public boolean isSystemAccount() {
        return systemAccount;
    }

    /** One-way, deliberate action - mirrors deactivateAndDelete()/markDeleted()'s shape. Only
     * ever called from seed/admin data setup, never reachable from any user-facing request. */
    public void markAsSystemAccount() {
        this.systemAccount = true;
    }

    /** Self-service only - see AuthServiceImpl.updatePresence. */
    public void setPresenceStatus(PresenceStatus presenceStatus) {
        this.presenceStatus = presenceStatus;
    }

    public void deactivateAndDelete() {
        this.active = false;
        this.deleted = true;
    }

    /** Suspend or restore login ability without deleting the account (Phase 4 plan, Part C). */
    public void setActive(boolean active) {
        this.active = active;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    /** Self-service update of the caller's own recovery email/phone - see AuthService. */
    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
}
