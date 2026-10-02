package com.company.project.modules.onboarding.repository;

import com.company.project.modules.onboarding.domain.InvitationEntity;
import com.company.project.modules.onboarding.domain.InvitationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface InvitationRepository extends JpaRepository<InvitationEntity, Long> {

    Optional<InvitationEntity> findByTokenHash(String tokenHash);

    /** Locked so an invitation can't be accepted twice concurrently. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<InvitationEntity> findLockedByTokenHash(String tokenHash);

    List<InvitationEntity> findAllByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, InvitationStatus status);

    List<InvitationEntity> findAllByCompanyIdAndInvitedByUserIdAndStatusOrderByCreatedAtDesc(
            Long companyId, Long invitedByUserId, InvitationStatus status);

    List<InvitationEntity> findAllByCompanyIdAndEmailIgnoreCaseAndStatus(Long companyId, String email, InvitationStatus status);
}
