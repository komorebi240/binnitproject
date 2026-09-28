package com.company.project.config;

import com.company.project.common.AuthorityLevel;
import com.company.project.modules.identity.domain.CompanyEntity;
import com.company.project.modules.identity.domain.DepartmentEntity;
import com.company.project.modules.identity.domain.PositionEntity;
import com.company.project.modules.identity.domain.UserEntity;
import com.company.project.modules.identity.repository.CompanyRepository;
import com.company.project.modules.identity.repository.DepartmentRepository;
import com.company.project.modules.identity.repository.PositionRepository;
import com.company.project.modules.identity.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Local-only demo data: 2 companies, 2 departments each, 4 users. Runs only under the "dev"
 * Spring profile — never in production (CLAUDE.md section 30) — and is idempotent (checks for
 * "binmit1" before inserting anything) so restarting the app doesn't fail on duplicate
 * usernames. Passwords equal each username but are BCrypt-hashed through the real
 * PasswordEncoder bean before being stored — never plaintext (CLAUDE.md section 7). These are
 * throwaway local credentials, not meant to exist in any real deployment.
 */
@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final CompanyRepository companyRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final PasswordEncoder passwordEncoder;

    public DevDataSeeder(
            CompanyRepository companyRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            PositionRepository positionRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.companyRepository = companyRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername("binmit1")) {
            log.info("Dev seed data already present, skipping.");
            return;
        }

        CompanyEntity companyA = companyRepository.save(new CompanyEntity("Doanh nghiệp A"));
        CompanyEntity companyB = companyRepository.save(new CompanyEntity("Doanh nghiệp B"));

        DepartmentEntity engineeringA = departmentRepository.save(new DepartmentEntity(companyA.getId(), "Kỹ thuật"));
        departmentRepository.save(new DepartmentEntity(companyA.getId(), "Truyền thông"));

        DepartmentEntity salesB = departmentRepository.save(new DepartmentEntity(companyB.getId(), "Kinh doanh"));
        departmentRepository.save(new DepartmentEntity(companyB.getId(), "Vận hành"));

        seedUser(companyA.getId(), "binmit1", "Binmit One", AuthorityLevel.EXECUTIVE, null, "CEO");
        seedUser(companyA.getId(), "binmit2", "Binmit Two", AuthorityLevel.EMPLOYEE, engineeringA.getId(), null);
        seedUser(companyB.getId(), "binmit3", "Binmit Three", AuthorityLevel.EXECUTIVE, null, "CEO");
        seedUser(companyB.getId(), "binmit4", "Binmit Four", AuthorityLevel.EMPLOYEE, salesB.getId(), null);

        log.info("Dev seed data created: 2 companies, 4 departments, 4 users.");
    }

    private void seedUser(
            Long companyId, String username, String fullName, AuthorityLevel level, Long departmentId, String title) {
        UserEntity user = userRepository.save(new UserEntity(
                companyId, username, passwordEncoder.encode(username), fullName, username + "@example.local"));
        positionRepository.save(new PositionEntity(user.getId(), level, departmentId, null, title));
    }
}
