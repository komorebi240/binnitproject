package com.company.project.modules.crm.repository;

import com.company.project.modules.crm.domain.CrmRowEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CrmRowRepository extends JpaRepository<CrmRowEntity, Long> {

    /** What duplicate detection needs from a row: its id and its two hashes, without loading the encrypted data. */
    interface RowHashes {
        Long getId();

        String getEmailHash();

        String getPhoneHash();
    }

    /** Number of rows per dataset, for the dataset list. */
    interface RowCount {
        Long getDatasetId();

        long getTotal();
    }

    @Query("select r from CrmRowEntity r where r.id = :id and r.companyId = :companyId")
    Optional<CrmRowEntity> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

    @Query("select r from CrmRowEntity r where r.datasetId = :datasetId order by r.id")
    Page<CrmRowEntity> findPageByDatasetId(@Param("datasetId") Long datasetId, Pageable pageable);

    @Query("select r from CrmRowEntity r where r.datasetId = :datasetId order by r.id")
    List<CrmRowEntity> findAllByDatasetId(@Param("datasetId") Long datasetId);

    @Query("select r.id as id, r.emailHash as emailHash, r.phoneHash as phoneHash from CrmRowEntity r where r.datasetId = :datasetId")
    List<RowHashes> findHashesByDatasetId(@Param("datasetId") Long datasetId);

    long countByDatasetId(Long datasetId);

    boolean existsByDatasetIdAndEmailHashAndIdNot(Long datasetId, String emailHash, Long id);

    boolean existsByDatasetIdAndPhoneHashAndIdNot(Long datasetId, String phoneHash, Long id);

    @Query("select r.datasetId as datasetId, count(r) as total from CrmRowEntity r where r.companyId = :companyId group by r.datasetId")
    List<RowCount> countByCompanyIdGroupedByDataset(@Param("companyId") Long companyId);

    /** Really deletes (not a flag): the customers are gone when their owner removes the dataset. */
    @Modifying
    @Query("delete from CrmRowEntity r where r.datasetId = :datasetId")
    int deleteAllByDatasetId(@Param("datasetId") Long datasetId);
}
