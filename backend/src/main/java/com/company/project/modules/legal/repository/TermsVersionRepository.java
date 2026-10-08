package com.company.project.modules.legal.repository;

import com.company.project.modules.legal.domain.TermsVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TermsVersionRepository extends JpaRepository<TermsVersionEntity, Integer> {

    Optional<TermsVersionEntity> findFirstByOrderByVersionDesc();
}
