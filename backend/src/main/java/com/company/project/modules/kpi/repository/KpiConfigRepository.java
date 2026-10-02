package com.company.project.modules.kpi.repository;

import com.company.project.modules.kpi.domain.KpiConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KpiConfigRepository extends JpaRepository<KpiConfigEntity, Long> {

    Optional<KpiConfigEntity> findByCompanyId(Long companyId);
}
