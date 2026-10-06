package com.company.project.modules.projects.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A Drive folder from the department catalog that the project's members share. */
@Entity
@Table(name = "project_folders")
public class ProjectFolderEntity extends ProjectAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "catalog_folder_id", nullable = false)
    private Long catalogFolderId;

    @Column(name = "linked_by_user_id", nullable = false)
    private Long linkedByUserId;

    protected ProjectFolderEntity() {
        // JPA
    }

    public ProjectFolderEntity(Long projectId, Long catalogFolderId, Long linkedByUserId) {
        this.projectId = projectId;
        this.catalogFolderId = catalogFolderId;
        this.linkedByUserId = linkedByUserId;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getCatalogFolderId() {
        return catalogFolderId;
    }
}
