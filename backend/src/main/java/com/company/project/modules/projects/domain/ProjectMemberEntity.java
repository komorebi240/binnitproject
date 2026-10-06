package com.company.project.modules.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "project_members")
public class ProjectMemberEntity extends ProjectAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** The member's department when they joined (null for an executive without one). */
    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "added_by_user_id", nullable = false)
    private Long addedByUserId;

    protected ProjectMemberEntity() {
        // JPA
    }

    public ProjectMemberEntity(Long projectId, Long userId, Long departmentId, Long addedByUserId) {
        this.projectId = projectId;
        this.userId = userId;
        this.departmentId = departmentId;
        this.addedByUserId = addedByUserId;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getDepartmentId() {
        return departmentId;
    }
}
