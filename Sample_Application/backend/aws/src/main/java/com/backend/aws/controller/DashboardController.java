package com.backend.aws.controller;

import com.backend.aws.dto.SummaryDto;
import com.backend.aws.repository.*;
import com.backend.aws.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepo;
    private final MarksheetRepository marksheetRepo;
    private final NoteRepository noteRepo;
    private final TaskRepository taskRepo;
    private final ProductRepository productRepo;
    private final EventRepository eventRepo;
    private final FileMetadataRepository fileRepo;
    private final NotificationRepository notificationRepo;
    private final AuditLogRepository auditRepo;
    private final SummaryService summaryService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        // Entity counts
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("users", userRepo.count());
        counts.put("marksheets", marksheetRepo.count());
        counts.put("notes", noteRepo.count());
        counts.put("tasks", taskRepo.count());
        counts.put("products", productRepo.count());
        counts.put("events", eventRepo.count());
        counts.put("files", fileRepo.count());
        counts.put("notifications", notificationRepo.count());
        stats.put("counts", counts);

        // Quick metrics
        stats.put("unreadNotifications", notificationRepo.countByIsReadFalse());
        stats.put("recentAuditLogs", auditRepo.findTop50ByOrderByTimestampDesc().size());
        stats.put("timestamp", LocalDateTime.now().toString());
        stats.put("status", "HEALTHY");

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/summary")
    public ResponseEntity<SummaryDto.DashboardSummaryResponse> getSummary() {
        return ResponseEntity.ok(summaryService.buildDashboardSummary());
    }
}
