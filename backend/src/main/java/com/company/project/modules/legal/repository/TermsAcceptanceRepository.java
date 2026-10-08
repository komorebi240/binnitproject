package com.company.project.modules.legal.repository;

import com.company.project.modules.legal.domain.TermsAcceptanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TermsAcceptanceRepository extends JpaRepository<TermsAcceptanceEntity, Long> {

    boolean existsByUserIdAndVersion(Long userId, Integer version);
}
