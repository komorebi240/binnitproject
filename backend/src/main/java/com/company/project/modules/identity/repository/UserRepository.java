package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query("select u from UserEntity u where u.id = :id and u.deleted = false")
    Optional<UserEntity> findActiveById(@Param("id") Long id);

    @Query("select u from UserEntity u where u.companyId = :companyId and u.deleted = false")
    List<UserEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    @Query("select u from UserEntity u where u.id in :ids and u.deleted = false")
    List<UserEntity> findAllActiveByIds(@Param("ids") List<Long> ids);
}
