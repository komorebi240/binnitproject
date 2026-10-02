package com.company.project.modules.calendar.repository;

import com.company.project.modules.calendar.domain.CalendarEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CalendarEventRepository extends JpaRepository<CalendarEventEntity, Long> {

    @Query("select e from CalendarEventEntity e where e.id = :id and e.deleted = false")
    Optional<CalendarEventEntity> findActiveById(@Param("id") Long id);

    @Query("select e from CalendarEventEntity e where e.userId = :userId and e.deleted = false order by e.startAt asc")
    List<CalendarEventEntity> findAllActiveByUserId(@Param("userId") Long userId);
}
