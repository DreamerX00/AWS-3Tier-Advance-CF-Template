package com.backend.aws.repository;

import com.backend.aws.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByIsActive(Boolean isActive);
    List<Event> findByCategory(String category);
    List<Event> findByOrganizer(String organizer);
    List<Event> findByDateBetween(LocalDate startDate, LocalDate endDate);
    List<Event> findByDateAfter(LocalDate date);

    @Query("SELECT e FROM Event e WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(e.description) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(e.venue) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Event> search(@Param("q") String query);
}
