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
 * Spring profile - never in production (CLAUDE.md section 30) - and is idempotent (checks for
 * "binmit1" before inserting anything) so restarting the app doesn't fail on duplicate
 * usernames. Passwords equal each username but are BCrypt-hashed through the real
 * PasswordEncoder bean before being stored - never plaintext (CLAUDE.md section 7). These are
 * throwaway local credentials, not meant to exist in any real deployment.
 *
 * All seed accounts share the SAME real recovery email (SEED_RECOVERY_EMAIL) instead of a
 * per-user fake address - a deliberate, explicit choice so the developer running this locally
 * can actually receive and verify a real forgot-password OTP end to end. This is a dev/demo
 * convenience ONLY: a real deployment must never bind more than one real employee to the same
 * recovery email (CLAUDE.md section 7 - minimize exposure, one identity per credential).
 */
@Component
@Profile("dev")
public class DevDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);
    private static final String SEED_RECOVERY_EMAIL = "nnn176456@gmail.com";

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
        Long companyAId;
        if (userRepository.existsByUsername("binmit1")) {
            log.info("Dev seed data already present, skipping.");
            companyAId = companyRepository.findAll().stream()
                    .filter(c -> c.getName().equals("Doanh nghiệp A"))
                    .findFirst()
                    .map(CompanyEntity::getId)
                    .orElseThrow(() -> new IllegalStateException("Expected 'Doanh nghiệp A' to already exist"));
        } else {
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
            companyAId = companyA.getId();

            log.info("Dev seed data created: 2 companies, 4 departments, 4 users.");
        }

        // Checked independently of the block above, with its own existence check - this was
        // added in a later phase, after real local databases already had "binmit1" seeded, so
        // gating it behind that same early-return would have silently never created this account
        // on any already-seeded DB (caught by actually trying to log in as it, not by reading
        // the code - see backend README's Phase 14 section).
        if (!userRepository.existsByUsername("orbit_broadcast")) {
            seedSystemBroadcastAccount(companyAId);
            log.info("Dev seed data created: 1 system broadcast account.");
        }
    }

    private void seedUser(
            Long companyId, String username, String fullName, AuthorityLevel level, Long departmentId, String title) {
        UserEntity user = userRepository.save(new UserEntity(
                companyId, username, passwordEncoder.encode(username), fullName, SEED_RECOVERY_EMAIL));
        positionRepository.save(new PositionEntity(user.getId(), level, departmentId, null, title));
    }

    /**
     * The one account allowed to message any user in any company (MessageServiceImpl's
     * requireSameCompanyUser bypass) - see the Phase 14 plan. Deliberately NOT password-equals-
     * username like the other seed accounts, since this one has real cross-tenant power; the
     * password is documented once in backend/README.md, not hard-coded anywhere else.
     * `markAsSystemAccount()` is the only place in the whole codebase that ever sets this flag -
     * no create/update-user request path can grant it.
     */
    private void seedSystemBroadcastAccount(Long companyId) {
        UserEntity user = new UserEntity(
                companyId, "orbit_broadcast", passwordEncoder.encode("OrbitBroadcast#2026!"),
                "Thông báo nội bộ", SEED_RECOVERY_EMAIL);
        user.markAsSystemAccount();
        user = userRepository.save(user);
        positionRepository.save(new PositionEntity(user.getId(), AuthorityLevel.EXECUTIVE, null, null, "Bot thông báo"));
    }
}
