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

    boolean existsByEmployeeCode(String employeeCode);

    /** {@code email} must already be lower-case (callers normalise it). */
    @Query("select u from UserEntity u where lower(u.email) = :email and u.deleted = false")
    List<UserEntity> findAllActiveByEmail(@Param("email") String email);

    @Query("select u from UserEntity u where u.id = :id and u.deleted = false")
    Optional<UserEntity> findActiveById(@Param("id") Long id);

    @Query("select u from UserEntity u where u.companyId = :companyId and u.deleted = false")
    List<UserEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    @Query("select u from UserEntity u where u.id in :ids and u.deleted = false")
    List<UserEntity> findAllActiveByIds(@Param("ids") List<Long> ids);

    /** Every active user across every company - only ever used for a system/broadcast account's
     * fan-out (MessageServiceImpl.broadcastMessage), never for a normal tenant-scoped query. */
    @Query("select u from UserEntity u where u.deleted = false")
    List<UserEntity> findAllActive();
}
