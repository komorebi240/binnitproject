package com.company.project.modules.whiteboards.repository;

import com.company.project.modules.whiteboards.domain.WhiteboardMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WhiteboardMemberRepository extends JpaRepository<WhiteboardMemberEntity, Long> {

    Optional<WhiteboardMemberEntity> findByWhiteboardIdAndUserId(Long whiteboardId, Long userId);

    List<WhiteboardMemberEntity> findByWhiteboardIdOrderByIdAsc(Long whiteboardId);

    List<WhiteboardMemberEntity> findByUserIdAndWhiteboardIdIn(Long userId, Collection<Long> whiteboardIds);

    long countByWhiteboardId(Long whiteboardId);
}
