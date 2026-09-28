package com.company.project.modules.drive.repository;

import com.company.project.modules.drive.domain.FolderAccessRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FolderAccessRequestRepository extends JpaRepository<FolderAccessRequestEntity, Long> {

    @Query("select r from FolderAccessRequestEntity r where r.id = :id and r.deleted = false")
    Optional<FolderAccessRequestEntity> findActiveById(@Param("id") Long id);

    @Query("select r from FolderAccessRequestEntity r where r.companyId = :companyId and r.deleted = false order by r.createdAt desc")
    List<FolderAccessRequestEntity> findAllActiveByCompanyId(@Param("companyId") Long companyId);

    /** authorizedCatalogFolderIds = catalog folders the caller has decision authority over
     * (their own department's folders, for a DEPARTMENT_HEAD) — see FolderAccessRequestServiceImpl. */
    @Query("""
            select r from FolderAccessRequestEntity r where r.deleted = false and (
                r.requesterUserId = :userId
                or r.catalogFolderId in :authorizedCatalogFolderIds
            ) order by r.createdAt desc
            """)
    List<FolderAccessRequestEntity> findAllActiveForUserOrAuthorizedFolders(
            @Param("userId") Long userId, @Param("authorizedCatalogFolderIds") List<Long> authorizedCatalogFolderIds);
}
