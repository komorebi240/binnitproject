package com.company.project.modules.drive.domain;

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
 * One user's own Google Drive connection (Phase 3 plan — per-user, not a shared company
 * account). {@code refreshTokenEncrypted} is AES-GCM ciphertext produced by
 * {@link com.company.project.security.TokenEncryptionService} — never store or log the
 * plaintext refresh token (CLAUDE.md section 7).
 */
@Entity
@Table(name = "google_drive_connections")
@EntityListeners(AuditingEntityListener.class)
public class GoogleDriveConnectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "google_email", nullable = false, length = 200)
    private String googleEmail;

    @Column(name = "refresh_token_encrypted", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String refreshTokenEncrypted;

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

    protected GoogleDriveConnectionEntity() {
        // JPA
    }

    public GoogleDriveConnectionEntity(Long userId, String googleEmail, String refreshTokenEncrypted) {
        this.userId = userId;
        this.googleEmail = googleEmail;
        this.refreshTokenEncrypted = refreshTokenEncrypted;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getGoogleEmail() {
        return googleEmail;
    }

    public String getRefreshTokenEncrypted() {
        return refreshTokenEncrypted;
    }

    public void updateToken(String googleEmail, String refreshTokenEncrypted) {
        this.googleEmail = googleEmail;
        this.refreshTokenEncrypted = refreshTokenEncrypted;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
