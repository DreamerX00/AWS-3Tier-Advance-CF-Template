package com.backend.gcp.service;

import com.backend.gcp.model.AuditLog;
import com.backend.gcp.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;

    public List<AuditLog> findAll() {
        return repository.findAll();
    }

    public List<AuditLog> findRecent() {
        return repository.findTop50ByOrderByTimestampDesc();
    }

    public List<AuditLog> findByEntityType(String entityType) {
        return repository.findByEntityType(entityType);
    }

    public List<AuditLog> findByAction(String action) {
        return repository.findByAction(action);
    }

    public List<AuditLog> findByEntityTypeAndAction(String entityType, String action) {
        return repository.findByEntityTypeAndAction(entityType, action);
    }

    public List<AuditLog> findByDateRange(LocalDateTime start, LocalDateTime end) {
        return repository.findByTimestampBetween(start, end);
    }

    public void log(String entityType, Long entityId, String action, String details) {
        AuditLog log = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .details(details)
                .performedBy("system")
                .build();
        repository.save(log);
    }

    public void log(String entityType, Long entityId, String action, String details, String performedBy) {
        AuditLog log = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .details(details)
                .performedBy(performedBy)
                .build();
        repository.save(log);
    }

    public void clearOlderThan(int days) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        List<AuditLog> old = repository.findByTimestampBetween(LocalDateTime.MIN, cutoff);
        repository.deleteAll(old);
    }
}
