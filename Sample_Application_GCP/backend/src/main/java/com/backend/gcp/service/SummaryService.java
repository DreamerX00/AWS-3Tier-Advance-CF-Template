package com.backend.gcp.service;

import com.backend.gcp.dto.SummaryDto;
import com.backend.gcp.model.AuditLog;
import com.backend.gcp.model.FileMetadata;
import com.backend.gcp.repository.AuditLogRepository;
import com.backend.gcp.repository.EventRepository;
import com.backend.gcp.repository.FileMetadataRepository;
import com.backend.gcp.repository.MarksheetRepository;
import com.backend.gcp.repository.NoteRepository;
import com.backend.gcp.repository.NotificationRepository;
import com.backend.gcp.repository.ProductRepository;
import com.backend.gcp.repository.TaskRepository;
import com.backend.gcp.repository.UserRepository;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.sql.DataSource;

@Service
@RequiredArgsConstructor
public class SummaryService {

    private final UserRepository userRepo;
    private final MarksheetRepository marksheetRepo;
    private final NoteRepository noteRepo;
    private final TaskRepository taskRepo;
    private final ProductRepository productRepo;
    private final EventRepository eventRepo;
    private final FileMetadataRepository fileRepo;
    private final NotificationRepository notificationRepo;
    private final AuditLogRepository auditRepo;
    private final DataSource dataSource;
    private final Storage storage;

    @Value("${app.storage.bucket-name:gcp-practice-storage}")
    private String storageBucketName;

    public SummaryDto.DashboardSummaryResponse buildDashboardSummary() {
        Map<String, Long> counts = buildCounts();

        return new SummaryDto.DashboardSummaryResponse(
                "UP",
                LocalDateTime.now(),
                counts.values().stream().mapToLong(Long::longValue).sum(),
                counts,
                notificationRepo.countByIsReadFalse(),
                auditRepo.findTop50ByOrderByTimestampDesc().size(),
                buildStorageSummary(6),
                buildActivityRecent(10)
        );
    }

    public SummaryDto.ActivityRecentResponse buildActivityRecent(int limit) {
        List<AuditLog> recentLogs = auditRepo.findTop50ByOrderByTimestampDesc();
        List<AuditLog> limited = recentLogs.stream().limit(limit).toList();

        Map<String, Long> actionBreakdown = recentLogs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getAction() == null ? "UNKNOWN" : log.getAction(),
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        List<SummaryDto.ActivityItem> items = limited.stream()
                .map(log -> new SummaryDto.ActivityItem(
                        log.getId(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getAction(),
                        log.getPerformedBy(),
                        log.getDetails(),
                        log.getTimestamp()
                ))
                .toList();

        return new SummaryDto.ActivityRecentResponse(
                LocalDateTime.now(),
                recentLogs.size(),
                actionBreakdown,
                items
        );
    }

    public SummaryDto.StorageSummaryResponse buildStorageSummary(int limit) {
        List<FileMetadata> files = fileRepo.findAll();

        long totalBytes = files.stream()
                .map(FileMetadata::getFileSize)
                .filter(size -> size != null)
                .mapToLong(Long::longValue)
                .sum();

        Map<String, Long> storageTypeBreakdown = files.stream()
                .collect(Collectors.groupingBy(
                        file -> normalizeValue(file.getStorageType(), "UNKNOWN"),
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        Map<String, Long> fileTypeBreakdown = files.stream()
                .collect(Collectors.groupingBy(
                        file -> {
                            String fileType = normalizeValue(file.getFileType(), "unknown/unknown");
                            return fileType.contains("/") ? fileType.substring(0, fileType.indexOf('/')) : fileType;
                        },
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        List<SummaryDto.StorageUploadItem> recentUploads = files.stream()
                .sorted(Comparator.comparing(FileMetadata::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .map(file -> new SummaryDto.StorageUploadItem(
                        file.getId(),
                        file.getFileName(),
                        file.getFileType(),
                        file.getFileSize(),
                        file.getUploadedBy(),
                        file.getStorageType(),
                        file.getCreatedAt()
                ))
                .toList();

        return new SummaryDto.StorageSummaryResponse(
                LocalDateTime.now(),
                files.size(),
                totalBytes,
                storageTypeBreakdown,
                fileTypeBreakdown,
                recentUploads
        );
    }

    public SummaryDto.SystemSummaryResponse buildSystemSummary() {
        Map<String, Long> counts = buildCounts();
        SummaryDto.SystemComponentStatus databaseStatus = probeDatabase();
        SummaryDto.SystemComponentStatus storageStatus = probeObjectStorage();
        SummaryDto.SystemComponentStatus auditStatus = new SummaryDto.SystemComponentStatus(
                "Audit Trail",
                "ACTIVE",
                "Operational changes are written into the audit stream."
        );
        String overallStatus = determineOverallStatus(databaseStatus, storageStatus);

        List<SummaryDto.SystemComponentStatus> components = List.of(
                new SummaryDto.SystemComponentStatus("Backend API", overallStatus, "Spring Boot application is serving health data."),
                databaseStatus,
                storageStatus,
                auditStatus
        );

        return new SummaryDto.SystemSummaryResponse(
                overallStatus,
                "GCP Practice Backend",
                LocalDateTime.now(),
                counts.values().stream().mapToLong(Long::longValue).sum(),
                counts,
                components,
                buildStorageSummary(5),
                buildActivityRecent(8)
        );
    }

    private Map<String, Long> buildCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("users", userRepo.count());
        counts.put("marksheets", marksheetRepo.count());
        counts.put("notes", noteRepo.count());
        counts.put("tasks", taskRepo.count());
        counts.put("products", productRepo.count());
        counts.put("events", eventRepo.count());
        counts.put("files", fileRepo.count());
        counts.put("notifications", notificationRepo.count());
        return counts;
    }

    private String normalizeValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private SummaryDto.SystemComponentStatus probeDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) {
                return new SummaryDto.SystemComponentStatus(
                        "PostgreSQL",
                        "UP",
                        "Primary relational store is accepting connections."
                );
            }
            return new SummaryDto.SystemComponentStatus(
                    "PostgreSQL",
                    "DEGRADED",
                    "Connection opened, but validation did not complete successfully."
            );
        } catch (Exception ex) {
            return new SummaryDto.SystemComponentStatus(
                    "PostgreSQL",
                    "DOWN",
                    "Database probe failed: " + ex.getMessage()
            );
        }
    }

    private SummaryDto.SystemComponentStatus probeObjectStorage() {
        try {
            Bucket bucket = storage.get(storageBucketName);
            if (bucket != null) {
                return new SummaryDto.SystemComponentStatus(
                        "Object Storage",
                        "UP",
                        "Google Cloud Storage is reachable and the practice bucket is available."
                );
            }
            return new SummaryDto.SystemComponentStatus(
                    "Object Storage",
                    "DEGRADED",
                    "Storage endpoint is reachable but bucket was not found."
            );
        } catch (StorageException ex) {
            return new SummaryDto.SystemComponentStatus(
                    "Object Storage",
                    "DEGRADED",
                    "Storage endpoint is reachable but bucket validation failed: " + ex.getMessage()
            );
        } catch (Exception ex) {
            return new SummaryDto.SystemComponentStatus(
                    "Object Storage",
                    "DOWN",
                    "Storage probe failed: " + ex.getMessage()
            );
        }
    }

    private String determineOverallStatus(SummaryDto.SystemComponentStatus... components) {
        boolean anyDown = java.util.Arrays.stream(components)
                .anyMatch(component -> "DOWN".equals(component.status()));
        if (anyDown) return "DOWN";

        boolean anyDegraded = java.util.Arrays.stream(components)
                .anyMatch(component -> "DEGRADED".equals(component.status()));
        if (anyDegraded) return "DEGRADED";

        return "UP";
    }
}
