package com.backend.aws.repository;

import com.backend.aws.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityType(String entityType);
    List<AuditLog> findByAction(String action);
    List<AuditLog> findByEntityTypeAndAction(String entityType, String action);
    List<AuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
    List<AuditLog> findTop50ByOrderByTimestampDesc();
}
