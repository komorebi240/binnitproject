package com.company.project.modules.onboarding.repository;

import com.company.project.modules.onboarding.domain.RegistrationVerificationEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RegistrationVerificationRepository extends JpaRepository<RegistrationVerificationEntity, Long> {

    /** Codes still waiting for their OTP: newest first. */
    @Query("""
            select v from RegistrationVerificationEntity v
            where v.email = :email and v.consumed = false and v.verified = false
            order by v.createdAt desc
            """)
    List<RegistrationVerificationEntity> findOpenByEmail(@Param("email") String email);

    /** Locked so two concurrent registrations can't both spend the same token. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RegistrationVerificationEntity> findByTokenHash(String tokenHash);
}
