package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.EmailChangeRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmailChangeRequestRepository extends JpaRepository<EmailChangeRequestEntity, Long> {

    /** Requests of this user that were not confirmed or replaced yet, newest first. */
    @Query("""
            select r from EmailChangeRequestEntity r
            where r.userId = :userId and r.consumed = false
            order by r.createdAt desc, r.id desc
            """)
    List<EmailChangeRequestEntity> findOpenByUserId(@Param("userId") Long userId);
}
