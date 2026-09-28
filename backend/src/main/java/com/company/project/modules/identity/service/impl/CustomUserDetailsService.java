package com.company.project.modules.identity.service.impl;

import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.security.UserPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads the identity + active position AuthenticationManager needs during login. Only used
 * at login time — every later request is authenticated from JWT claims instead
 * (JwtAuthenticationFilter), not by hitting the database again.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;

    public CustomUserDetailsService(UserRepository userRepository, PositionRepository positionRepository) {
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid username or password"));

        PositionEntity position = positionRepository.findActiveByUserId(user.getId())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid username or password"));

        return new UserPrincipal(
                user.getId(),
                user.getUsername(),
                user.getPasswordHash(),
                user.getCompanyId(),
                position.getAuthorityLevel(),
                position.getDepartmentId(),
                position.getTeamId(),
                user.isActive()
        );
    }
}
