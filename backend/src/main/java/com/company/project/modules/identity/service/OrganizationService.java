package com.company.project.modules.identity.service;

import com.company.project.modules.identity.dto.request.CreateDepartmentRequest;
import com.company.project.modules.identity.dto.request.CreateTeamRequest;
import com.company.project.modules.identity.dto.request.UpdateCompanyRequest;
import com.company.project.modules.identity.dto.response.CompanyResponse;
import com.company.project.modules.identity.dto.response.DepartmentMemberResponse;
import com.company.project.modules.identity.dto.response.DepartmentResponse;
import com.company.project.modules.identity.dto.response.TeamResponse;
import com.company.project.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface OrganizationService {

    /** Any member of the company may read its basic profile (name, contact email, logo). */
    CompanyResponse getMyCompany(UserPrincipal caller);

    /** EXECUTIVE only, and only the caller's own company (CLAUDE.md section 9/10). */
    CompanyResponse updateCompany(UpdateCompanyRequest request, UserPrincipal caller);

    /** EXECUTIVE only; validated by AvatarStorageService (PNG/JPEG/WebP, 2MB); the previous logo file is removed. */
    CompanyResponse uploadCompanyLogo(MultipartFile file, UserPrincipal caller);

    /** Any member of the company; 404 when no logo is set. */
    AvatarStorageService.Resolved getCompanyLogoFile(UserPrincipal caller);

    DepartmentResponse createDepartment(CreateDepartmentRequest request, UserPrincipal caller);

    List<DepartmentResponse> listDepartments(UserPrincipal caller);

    /** Internal company directory - readable by anyone in the same company (Phase 7 plan). */
    List<DepartmentMemberResponse> listDepartmentMembers(Long departmentId, UserPrincipal caller);

    void deleteDepartment(Long departmentId, UserPrincipal caller);

    TeamResponse createTeam(Long departmentId, CreateTeamRequest request, UserPrincipal caller);

    List<TeamResponse> listTeams(Long departmentId, UserPrincipal caller);

    /** Same visibility rule as listDepartmentMembers - anyone in the same company. */
    List<DepartmentMemberResponse> listTeamMembers(Long teamId, UserPrincipal caller);

    void deleteTeam(Long teamId, UserPrincipal caller);
}
