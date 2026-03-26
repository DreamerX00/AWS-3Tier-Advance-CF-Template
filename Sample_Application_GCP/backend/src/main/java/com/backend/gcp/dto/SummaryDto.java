package com.backend.gcp.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public final class SummaryDto {

    private SummaryDto() {
    }

    public record ActivityItem(
            Long id,
            String entityType,
            Long entityId,
            String action,
            String performedBy,
            String details,
            LocalDateTime timestamp
    ) {
    }

    public record ActivityRecentResponse(
            LocalDateTime generatedAt,
            long total,
            Map<String, Long> actionBreakdown,
            List<ActivityItem> items
    ) {
    }

    public record StorageUploadItem(
            Long id,
            String fileName,
            String fileType,
            Long fileSize,
            String uploadedBy,
            String storageType,
            LocalDateTime createdAt
    ) {
    }

    public record StorageSummaryResponse(
            LocalDateTime generatedAt,
            long totalFiles,
            long totalBytes,
            Map<String, Long> storageTypeBreakdown,
            Map<String, Long> fileTypeBreakdown,
            List<StorageUploadItem> recentUploads
    ) {
    }

    public record DashboardSummaryResponse(
            String status,
            LocalDateTime generatedAt,
            long totalRecords,
            Map<String, Long> counts,
            long unreadNotifications,
            long recentAuditLogs,
            StorageSummaryResponse storage,
            ActivityRecentResponse activity
    ) {
    }

    public record SystemComponentStatus(
            String name,
            String status,
            String detail
    ) {
    }

    public record SystemSummaryResponse(
            String status,
            String service,
            LocalDateTime generatedAt,
            long totalRecords,
            Map<String, Long> counts,
            List<SystemComponentStatus> components,
            StorageSummaryResponse storage,
            ActivityRecentResponse activity
    ) {
    }
}
