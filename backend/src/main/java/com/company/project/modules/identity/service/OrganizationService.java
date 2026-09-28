package com.company.project.modules.identity.service;

import com.company.project.modules.identity.dto.request.CreateDepartmentRequest;
import com.company.project.modules.identity.dto.request.CreateTeamRequest;
import com.company.project.modules.identity.dto.response.DepartmentResponse;
import com.company.project.modules.identity.dto.response.TeamResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface OrganizationService {

    DepartmentResponse createDepartment(CreateDepartmentRequest request, UserPrincipal caller);

    List<DepartmentResponse> listDepartments(UserPrincipal caller);

    void deleteDepartment(Long departmentId, UserPrincipal caller);

    TeamResponse createTeam(Long departmentId, CreateTeamRequest request, UserPrincipal caller);

    List<TeamResponse> listTeams(Long departmentId, UserPrincipal caller);

    void deleteTeam(Long teamId, UserPrincipal caller);
}
