package com.backend.gcp.repository;

import com.backend.gcp.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByStatus(String status);
    List<Task> findByPriority(String priority);
    List<Task> findByAssignee(String assignee);
    List<Task> findByStatusAndPriority(String status, String priority);

    @Query("SELECT t FROM Task t WHERE LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(t.assignee) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Task> search(@Param("q") String query);
}
