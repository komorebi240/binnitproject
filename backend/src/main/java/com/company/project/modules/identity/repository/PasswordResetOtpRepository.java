package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.PasswordResetOtpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtpEntity, Long> {

    @Query("select o from PasswordResetOtpEntity o where o.userId = :userId and o.used = false")
    List<PasswordResetOtpEntity> findAllUnusedByUserId(@Param("userId") Long userId);
}
