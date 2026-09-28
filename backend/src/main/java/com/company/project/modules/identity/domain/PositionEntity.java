package com.company.project.modules.identity.domain;

import com.company.project.common.AuthorityLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * A user's current org placement and authority tier. Kept separate from {@link UserEntity}
 * so a promotion/transfer is "close the old position, open a new one," not a user-row edit —
 * see the Phase 1 plan for why. The DB also enforces that department/team match the
 * authority level (ck_positions_scope_matches_level in V4) — this constructor mirrors that
 * rule in application code so a bad combination fails fast with a clear message instead of a
 * raw constraint-violation exception.
 */
@Entity
@Table(name = "positions")
@EntityListeners(AuditingEntityListener.class)
public class PositionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "team_id")
    private Long teamId;

    @Enumerated(EnumType.STRING)
    @Column(name = "authority_level", nullable = false, length = 30)
    private AuthorityLevel authorityLevel;

    @Column(length = 100)
    private String title;

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

    protected PositionEntity() {
        // JPA
    }

    public PositionEntity(Long userId, AuthorityLevel authorityLevel, Long departmentId, Long teamId, String title) {
        if (!isScopeValid(authorityLevel, departmentId, teamId)) {
            // Callers should validate with isScopeValid(...) first and raise a proper 422
            // (BusinessException) — reaching this means that check was skipped.
            throw new IllegalArgumentException(
                    "departmentId/teamId do not match authority level " + authorityLevel);
        }
        this.userId = userId;
        this.authorityLevel = authorityLevel;
        this.departmentId = departmentId;
        this.teamId = teamId;
        this.title = title;
    }

    /** Mirrors the DB check constraint ck_positions_scope_matches_level (V4 migration). */
    public static boolean isScopeValid(AuthorityLevel level, Long departmentId, Long teamId) {
        return switch (level) {
            case EXECUTIVE -> departmentId == null && teamId == null;
            case DEPARTMENT_HEAD -> departmentId != null && teamId == null;
            // departmentId is required (not just teamId) so department-scoped queries
            // (e.g. "list everyone in department X") don't need to join through team.
            case TEAM_LEAD -> departmentId != null && teamId != null;
            case EMPLOYEE -> departmentId != null;
        };
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public Long getTeamId() {
        return teamId;
    }

    public AuthorityLevel getAuthorityLevel() {
        return authorityLevel;
    }

    public String getTitle() {
        return title;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void markDeleted() {
        this.deleted = true;
    }
}
