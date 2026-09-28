package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<CompanyEntity, Long> {

    @Query("select c from CompanyEntity c where c.id = :id and c.deleted = false")
    Optional<CompanyEntity> findActiveById(@Param("id") Long id);
}
