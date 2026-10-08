package com.company.project.modules.crm.domain;

import jakarta.persistence.Column;
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

/**
 * One customer record. {@code data} is never plain text: it is the JSON object of the row's values, encrypted with the
 * company's key (see CrmCrypto); {@code emailHash}/{@code phoneHash} are keyed hashes used only to find duplicates.
 */
@Entity
@Table(name = "crm_rows")
@EntityListeners(AuditingEntityListener.class)
public class CrmRowEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_id", nullable = false, updatable = false)
    private Long datasetId;

    @Column(name = "company_id", nullable = false, updatable = false)
    private Long companyId;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String data;

    @Column(name = "email_hash", length = 64)
    private String emailHash;

    @Column(name = "phone_hash", length = 64)
    private String phoneHash;

    @Column(name = "created_by_user_id", nullable = false, updatable = false)
    private Long createdByUserId;

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

    protected CrmRowEntity() {
        // JPA
    }

    public CrmRowEntity(Long datasetId, Long companyId, String data, String emailHash, String phoneHash, Long createdByUserId) {
        this.datasetId = datasetId;
        this.companyId = companyId;
        this.data = data;
        this.emailHash = emailHash;
        this.phoneHash = phoneHash;
        this.createdByUserId = createdByUserId;
    }

    public Long getId() {
        return id;
    }

    public Long getDatasetId() {
        return datasetId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public String getData() {
        return data;
    }

    public String getEmailHash() {
        return emailHash;
    }

    public String getPhoneHash() {
        return phoneHash;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void replaceData(String data, String emailHash, String phoneHash) {
        this.data = data;
        this.emailHash = emailHash;
        this.phoneHash = phoneHash;
    }
}
