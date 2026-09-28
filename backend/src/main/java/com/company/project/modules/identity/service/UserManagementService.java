package com.company.project.modules.identity.service;

import com.company.project.modules.identity.dto.request.CreateUserRequest;
import com.company.project.modules.identity.dto.response.UserSummaryResponse;
import com.company.project.security.UserPrincipal;

import java.util.List;

public interface UserManagementService {

    UserSummaryResponse createUser(CreateUserRequest request, UserPrincipal caller);

    List<UserSummaryResponse> listUsers(UserPrincipal caller);

    void deleteUser(Long userId, UserPrincipal caller);
}
