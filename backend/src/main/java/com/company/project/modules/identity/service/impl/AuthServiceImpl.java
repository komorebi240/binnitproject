package com.company.project.modules.identity.service.impl;

import com.company.project.common.exception.ResourceNotFoundException;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.TeamEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.dto.response.UserProfileResponse;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.TeamRepository;
import com.company.project.modules.identity.repository.UserRepository;
import com.company.project.modules.identity.service.AuthService;
import com.company.project.security.UserPrincipal;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final PositionRepository positionRepository;

    public AuthServiceImpl(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            DepartmentRepository departmentRepository,
            TeamRepository teamRepository,
            PositionRepository positionRepository
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.teamRepository = teamRepository;
        this.positionRepository = positionRepository;
    }

    @Override
    public UserPrincipal authenticate(String username, String password) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
        return (UserPrincipal) authentication.getPrincipal();
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UserPrincipal principal) {
        UserEntity user = userRepository.findActiveById(principal.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUserId()));
        CompanyEntity company = companyRepository.findActiveById(principal.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Company", principal.getCompanyId()));
        PositionEntity position = positionRepository.findActiveByUserId(principal.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUserId()));

        String departmentName = principal.getDepartmentId() == null ? null
                : departmentRepository.findActiveById(principal.getDepartmentId())
                        .map(DepartmentEntity::getName).orElse(null);
        String teamName = principal.getTeamId() == null ? null
                : teamRepository.findActiveById(principal.getTeamId())
                        .map(TeamEntity::getName).orElse(null);

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                company.getId(),
                company.getName(),
                principal.getAuthorityLevel(),
                position.getTitle(),
                principal.getDepartmentId(),
                departmentName,
                principal.getTeamId(),
                teamName);
    }
}
