package com.company.project.modules.projects.service;

import com.company.project.modules.projects.domain.ProjectEntity;
import com.company.project.security.UserPrincipal;

/**
 * Who may do what in a project - the one place these rules live, so the project screens and the task module
 * (project tasks) cannot drift apart. Every method re-derives the answer from the caller's own identity.
 */
public interface ProjectAccessService {

    /** The project, or ResourceNotFoundException when it does not exist, is deleted, or belongs to another company. */
    ProjectEntity requireProject(Long projectId, UserPrincipal caller);

    /** An executive, or the head of the owning department. */
    boolean canManage(ProjectEntity project, UserPrincipal caller);

    /** A member, or someone who manages the project: may use its tasks, chat and folders. */
    boolean isParticipant(ProjectEntity project, UserPrincipal caller);

    /** A participant, or the head of any department taking part (so they can answer an invitation). */
    boolean canView(ProjectEntity project, UserPrincipal caller);

    boolean isMember(Long projectId, Long userId);

    boolean isHeadOf(UserPrincipal caller, Long departmentId);

    /** Same lookup as requireProject plus: 404 when the caller cannot even see it, 403 when they only see it but may not work in it. */
    ProjectEntity requireParticipant(Long projectId, UserPrincipal caller);
}
