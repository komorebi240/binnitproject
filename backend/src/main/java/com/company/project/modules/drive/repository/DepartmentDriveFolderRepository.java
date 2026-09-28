package com.company.project.modules.drive.repository;

import com.company.project.modules.drive.domain.DepartmentDriveFolderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DepartmentDriveFolderRepository extends JpaRepository<DepartmentDriveFolderEntity, Long> {

    @Query("select f from DepartmentDriveFolderEntity f where f.id = :id and f.deleted = false")
    Optional<DepartmentDriveFolderEntity> findActiveById(@Param("id") Long id);

    @Query("select f from DepartmentDriveFolderEntity f where f.companyId = :companyId and f.deleted = false order by f.createdAt desc")
    List<DepartmentDriveFolderEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    boolean existsByDepartmentIdAndGoogleFolderIdAndDeletedFalse(Long departmentId, String googleFolderId);

    @Query("select f.id from DepartmentDriveFolderEntity f where f.departmentId = :departmentId and f.deleted = false")
    List<Long> findIdsByDepartmentId(@Param("departmentId") Long departmentId);
}
