package com.company.project.modules.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "projects")
public class ProjectEntity extends ProjectAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(name = "owner_department_id", nullable = false)
    private Long ownerDepartmentId;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    protected ProjectEntity() {
        // JPA
    }

    public ProjectEntity(Long companyId, String name, String description, Long ownerDepartmentId, Long createdByUserId) {
        this.companyId = companyId;
        this.name = name;
        this.description = description;
        this.ownerDepartmentId = ownerDepartmentId;
        this.createdByUserId = createdByUserId;
    }

    public void updateDetails(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Long getOwnerDepartmentId() {
        return ownerDepartmentId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }
}
