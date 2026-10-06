package com.company.project.modules.projects.service.impl;

import com.company.project.common.AuthorityLevel;
import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.projects.domain.ProjectEntity;
import com.company.project.modules.projects.repository.ProjectDepartmentRepository;
import com.company.project.modules.projects.repository.ProjectMemberRepository;
import com.company.project.modules.projects.repository.ProjectRepository;
import com.company.project.modules.projects.service.ProjectAccessService;
import com.company.project.security.UserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectAccessServiceImpl implements ProjectAccessService {

    private final ProjectRepository projectRepository;
    private final ProjectDepartmentRepository departmentRepository;
    private final ProjectMemberRepository memberRepository;

    public ProjectAccessServiceImpl(
            ProjectRepository projectRepository,
            ProjectDepartmentRepository departmentRepository,
            ProjectMemberRepository memberRepository
    ) {
        this.projectRepository = projectRepository;
        this.departmentRepository = departmentRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectEntity requireProject(Long projectId, UserPrincipal caller) {
        return projectRepository.findActiveById(projectId)
                .filter(project -> project.getCompanyId().equals(caller.getCompanyId()))
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
    }

    @Override
    public boolean canManage(ProjectEntity project, UserPrincipal caller) {
        return caller.getAuthorityLevel() == AuthorityLevel.EXECUTIVE || isHeadOf(caller, project.getOwnerDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isParticipant(ProjectEntity project, UserPrincipal caller) {
        return canManage(project, caller) || isMember(project.getId(), caller.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canView(ProjectEntity project, UserPrincipal caller) {
        if (isParticipant(project, caller)) {
            return true;
        }
        return caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && departmentRepository.findActive(project.getId(), caller.getDepartmentId()).isPresent();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMember(Long projectId, Long userId) {
        return memberRepository.findActive(projectId, userId).isPresent();
    }

    @Override
    public boolean isHeadOf(UserPrincipal caller, Long departmentId) {
        return caller.getAuthorityLevel() == AuthorityLevel.DEPARTMENT_HEAD
                && departmentId != null
                && departmentId.equals(caller.getDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectEntity requireParticipant(Long projectId, UserPrincipal caller) {
        ProjectEntity project = requireProject(projectId, caller);
        if (!canView(project, caller)) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        if (!isParticipant(project, caller)) {
            throw new AccessDeniedException("Only members of this project can do that");
        }
        return project;
    }
}
