package com.company.project.modules.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One department's part in a project: the owner, or an invited supporter with its answer to the invitation. */
@Entity
@Table(name = "project_departments")
public class ProjectDepartmentEntity extends ProjectAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectDepartmentRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectInviteStatus status;

    @Column(name = "invited_by_user_id", nullable = false)
    private Long invitedByUserId;

    @Column(length = 500)
    private String note;

    @Column(name = "decided_by_user_id")
    private Long decidedByUserId;

    @Column(name = "decided_at")
    private Instant decidedAt;

    protected ProjectDepartmentEntity() {
        // JPA
    }

    private ProjectDepartmentEntity(
            Long projectId, Long departmentId, ProjectDepartmentRole role, ProjectInviteStatus status, Long invitedByUserId, String note) {
        this.projectId = projectId;
        this.departmentId = departmentId;
        this.role = role;
        this.status = status;
        this.invitedByUserId = invitedByUserId;
        this.note = note;
    }

    public static ProjectDepartmentEntity owner(Long projectId, Long departmentId, Long createdByUserId) {
        return new ProjectDepartmentEntity(
                projectId, departmentId, ProjectDepartmentRole.OWNER, ProjectInviteStatus.ACCEPTED, createdByUserId, null);
    }

    public static ProjectDepartmentEntity invite(Long projectId, Long departmentId, Long invitedByUserId, String note) {
        return new ProjectDepartmentEntity(
                projectId, departmentId, ProjectDepartmentRole.SUPPORT, ProjectInviteStatus.INVITED, invitedByUserId, note);
    }

    /** A declined department can be invited again: the same row goes back to INVITED. */
    public void reinvite(Long invitedByUserId, String note) {
        this.status = ProjectInviteStatus.INVITED;
        this.invitedByUserId = invitedByUserId;
        this.note = note;
        this.decidedByUserId = null;
        this.decidedAt = null;
    }

    public void decide(boolean accepted, Long decidedByUserId) {
        this.status = accepted ? ProjectInviteStatus.ACCEPTED : ProjectInviteStatus.DECLINED;
        this.decidedByUserId = decidedByUserId;
        this.decidedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public ProjectDepartmentRole getRole() {
        return role;
    }

    public ProjectInviteStatus getStatus() {
        return status;
    }

    public Long getInvitedByUserId() {
        return invitedByUserId;
    }

    public String getNote() {
        return note;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }
}
