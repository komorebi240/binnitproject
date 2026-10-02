package com.company.project.modules.notes.repository;

import com.company.project.modules.notes.domain.NoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<NoteEntity, Long> {

    @Query("select n from NoteEntity n where n.id = :id and n.userId = :userId and n.deleted = false")
    Optional<NoteEntity> findActiveByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("select n from NoteEntity n where n.userId = :userId and n.deleted = false order by n.updatedAt desc nulls last, n.createdAt desc")
    List<NoteEntity> findAllActiveByUserId(@Param("userId") Long userId);
}
