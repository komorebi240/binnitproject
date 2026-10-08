package com.company.project.modules.identity.repository;

import com.company.project.modules.identity.domain.AuthSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSessionEntity, Long> {

    Optional<AuthSessionEntity> findByTokenHash(String tokenHash);

    /** Ending a session deletes its row: the cookie then matches nothing, which is the same answer as "revoked". */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from AuthSessionEntity s where s.userId = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from AuthSessionEntity s where s.userId = :userId and s.tokenHash <> :keepTokenHash")
    int deleteOthersByUserId(@Param("userId") Long userId, @Param("keepTokenHash") String keepTokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from AuthSessionEntity s where s.tokenHash = :tokenHash")
    int deleteByTokenHash(@Param("tokenHash") String tokenHash);

    /** Housekeeping on every sign-in of a user: sessions that can never be used again (expired, or idle past the cutoff). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from AuthSessionEntity s where s.userId = :userId and (s.expiresAt <= :now or s.lastActivityAt <= :idleCutoff)")
    int deleteDeadByUserId(@Param("userId") Long userId, @Param("now") Instant now, @Param("idleCutoff") Instant idleCutoff);
}
