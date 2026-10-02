package com.company.project.common;

/**
 * ASSIGNED -> ACCEPTED|DECLINED -> DONE, or CANCELLED at any point before DONE. No separate
 * "in progress" step in Phase 2 - accepting a task counts as starting it (see the Phase 2
 * plan for why; add a finer-grained status later if progress tracking is actually needed).
 */
public enum TaskStatus {
    ASSIGNED,
    ACCEPTED,
    DECLINED,
    DONE,
    CANCELLED
}
