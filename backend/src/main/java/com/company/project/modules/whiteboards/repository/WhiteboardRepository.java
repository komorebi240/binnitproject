package com.company.project.modules.whiteboards.repository;

import com.company.project.modules.whiteboards.domain.WhiteboardEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WhiteboardRepository extends JpaRepository<WhiteboardEntity, Long> {

    @Query("select w from WhiteboardEntity w where w.id = :id and w.deleted = false")
    Optional<WhiteboardEntity> findActiveById(@Param("id") Long id);

    /** Held until the transaction ends, so two saves of one board are checked against its version one after the other. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WhiteboardEntity w where w.id = :id and w.deleted = false")
    Optional<WhiteboardEntity> findActiveByIdForUpdate(@Param("id") Long id);

    /** Boards the user owns or was shared, without the drawings themselves (a list never needs them). */
    @Query("""
            select new com.company.project.modules.whiteboards.repository.WhiteboardSummaryView(
                w.id, w.title, w.ownerId, w.version, w.updatedAt)
            from WhiteboardEntity w
            where w.deleted = false and w.companyId = :companyId
              and (w.ownerId = :userId
                   or exists (select 1 from WhiteboardMemberEntity m where m.whiteboardId = w.id and m.userId = :userId))
            order by w.updatedAt desc
            """)
    List<WhiteboardSummaryView> findVisibleTo(@Param("companyId") Long companyId, @Param("userId") Long userId);

    @Query("select count(w) from WhiteboardEntity w where w.ownerId = :ownerId and w.deleted = false")
    long countActiveByOwnerId(@Param("ownerId") Long ownerId);
}
