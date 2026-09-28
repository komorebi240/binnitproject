package com.company.project.modules.drive.repository;

import com.company.project.modules.drive.domain.GoogleDriveConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GoogleDriveConnectionRepository extends JpaRepository<GoogleDriveConnectionEntity, Long> {

    @Query("select c from GoogleDriveConnectionEntity c where c.userId = :userId and c.deleted = false")
    Optional<GoogleDriveConnectionEntity> findActiveByUserId(@Param("userId") Long userId);
}
