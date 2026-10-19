package com.company.project.modules.whiteboards.domain;

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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/** A colleague the owner shared a board with. The owner is never a member row: ownership lives on the board. */
@Entity
@Table(name = "whiteboard_members")
@EntityListeners(AuditingEntityListener.class)
public class WhiteboardMemberEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "whiteboard_id", nullable = false, updatable = false)
    private Long whiteboardId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private WhiteboardRole role;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    protected WhiteboardMemberEntity() {
        // JPA
    }

    public WhiteboardMemberEntity(Long whiteboardId, Long userId, WhiteboardRole role) {
        this.whiteboardId = whiteboardId;
        this.userId = userId;
        this.role = role;
    }

    public void changeRole(WhiteboardRole role) {
        this.role = role;
    }

    public Long getWhiteboardId() {
        return whiteboardId;
    }

    public Long getUserId() {
        return userId;
    }

    public WhiteboardRole getRole() {
        return role;
    }
}
