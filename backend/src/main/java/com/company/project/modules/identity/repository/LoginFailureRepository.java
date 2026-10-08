package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.LoginFailureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoginFailureRepository extends JpaRepository<LoginFailureEntity, Long> {

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from LoginFailureEntity f where f.userId = :userId")
    int deleteByUserId(@Param("userId") Long userId);
}
