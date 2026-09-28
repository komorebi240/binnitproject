package com.company.project.modules.identity.service;

import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.security.UserPrincipal;

public interface AuthService {

    /** Throws org.springframework.security.core.AuthenticationException on any failure. */
    UserPrincipal authenticate(String username, String password);

    UserProfileResponse getProfile(UserPrincipal principal);
}
