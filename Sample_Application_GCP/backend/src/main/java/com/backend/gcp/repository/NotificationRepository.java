package com.backend.gcp.repository;

import com.backend.gcp.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByType(String type);
    List<Notification> findByStatus(String status);
    List<Notification> findByRecipient(String recipient);
    List<Notification> findByIsRead(Boolean isRead);
    List<Notification> findByPriority(String priority);
    long countByIsReadFalse();

    @Query("SELECT n FROM Notification n WHERE LOWER(n.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.message) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(n.recipient) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Notification> search(@Param("q") String query);
}
