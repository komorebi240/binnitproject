package com.company.project.common;

/**
 * A task's target: a specific USER, or an entire DEPARTMENT acting as a shared queue (see the
 * Phase 2 plan for why there is no TEAM-level assignee target yet).
 */
public enum AssigneeType {
    USER,
    DEPARTMENT
}
