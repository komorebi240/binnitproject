package com.company.project.modules.projects.service;

import com.company.project.modules.projects.dto.request.AddProjectMemberRequest;
import com.company.project.modules.projects.dto.request.CreateProjectRequest;
import com.company.project.modules.projects.dto.request.InviteDepartmentRequest;
import com.company.project.modules.projects.dto.request.LinkProjectFolderRequest;
import com.company.project.modules.projects.dto.request.SendProjectMessageRequest;
import com.company.project.modules.projects.dto.request.UpdateProjectRequest;
import com.company.project.modules.projects.dto.response.ProjectDetailResponse;
import com.company.project.modules.projects.dto.response.ProjectFolderLinkResponse;
import com.company.project.modules.projects.dto.response.ProjectMessageResponse;
import com.company.project.modules.projects.dto.response.ProjectSummaryResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

/** Cross-department projects: an owning department invites others; each accepted department's head picks its people. */
public interface ProjectService {

    /** EXECUTIVE (any department) or DEPARTMENT_HEAD (their own). */
    ProjectDetailResponse createProject(CreateProjectRequest request, UserPrincipal caller);

    /** Only the projects the caller can see: their own, those their department head answers for, or all for an executive. */
    List<ProjectSummaryResponse> listProjects(UserPrincipal caller);

    ProjectDetailResponse getProject(Long projectId, UserPrincipal caller);

    ProjectDetailResponse updateProject(Long projectId, UpdateProjectRequest request, UserPrincipal caller);

    void deleteProject(Long projectId, UserPrincipal caller);

    ProjectDetailResponse inviteDepartment(Long projectId, InviteDepartmentRequest request, UserPrincipal caller);

    /** The invited department's head (or an executive) answers the invitation. */
    ProjectDetailResponse respondToInvitation(Long projectId, Long departmentId, boolean accept, UserPrincipal caller);

    ProjectDetailResponse removeDepartment(Long projectId, Long departmentId, UserPrincipal caller);

    ProjectDetailResponse addMember(Long projectId, AddProjectMemberRequest request, UserPrincipal caller);

    ProjectDetailResponse removeMember(Long projectId, Long userId, UserPrincipal caller);

    ProjectFolderLinkResponse linkFolder(Long projectId, LinkProjectFolderRequest request, UserPrincipal caller);

    ProjectDetailResponse unlinkFolder(Long projectId, Long linkId, UserPrincipal caller);

    List<ProjectMessageResponse> listMessages(Long projectId, UserPrincipal caller);

    ProjectMessageResponse sendMessage(Long projectId, SendProjectMessageRequest request, UserPrincipal caller);
}
