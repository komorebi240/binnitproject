package com.company.project.security;

import com.company.project.common.AuthorityLevel;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/**
 * The authenticated identity for every request: who they are, which company they belong to
 * (the tenant boundary), and their org placement. Every scope check in the service layer
 * compares against these fields — never against a companyId/departmentId the client sent
 * (CLAUDE.md section 9/10).
 *
 * Built two ways: by {@link CustomUserDetailsService} from the database during login (has a
 * real password hash, used once by AuthenticationManager), and by {@link JwtService} from a
 * token's claims on every subsequent request (password hash is null — never needed again).
 */
public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final String username;
    private final String passwordHash;
    private final Long companyId;
    private final AuthorityLevel authorityLevel;
    private final Long departmentId;
    private final Long teamId;
    private final boolean enabled;

    public UserPrincipal(
            Long userId,
            String username,
            String passwordHash,
            Long companyId,
            AuthorityLevel authorityLevel,
            Long departmentId,
            Long teamId,
            boolean enabled
    ) {
        this.userId = userId;
        this.username = username;
        this.passwordHash = passwordHash;
        this.companyId = companyId;
        this.authorityLevel = authorityLevel;
        this.departmentId = departmentId;
        this.teamId = teamId;
        this.enabled = enabled;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getCompanyId() {
        return companyId;
    }

    public AuthorityLevel getAuthorityLevel() {
        return authorityLevel;
    }

    public Long getDepartmentId() {
        return departmentId;
    }

    public Long getTeamId() {
        return teamId;
    }

    @Override
    public List<GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(authorityLevel.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
