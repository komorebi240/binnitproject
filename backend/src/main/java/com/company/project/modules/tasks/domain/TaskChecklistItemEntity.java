package com.company.project.modules.tasks.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One tickable line of a task's checklist; when every line is ticked the task completes (see TaskServiceImpl). */
@Entity
@Table(name = "task_checklist_items")
public class TaskChecklistItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(nullable = false, length = 200)
    private String text;

    @Column(name = "is_done", nullable = false)
    private boolean done;

    @Column(name = "done_by_user_id")
    private Long doneByUserId;

    @Column(name = "done_at")
    private Instant doneAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TaskChecklistItemEntity() {
        // JPA
    }

    public TaskChecklistItemEntity(Long taskId, String text, int sortOrder, Long createdByUserId) {
        this.taskId = taskId;
        this.text = text;
        this.sortOrder = sortOrder;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public String getText() {
        return text;
    }

    public boolean isDone() {
        return done;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setDone(boolean done, Long byUserId) {
        this.done = done;
        this.doneByUserId = done ? byUserId : null;
        this.doneAt = done ? Instant.now() : null;
    }
}
