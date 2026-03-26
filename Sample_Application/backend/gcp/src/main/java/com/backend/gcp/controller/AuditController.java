package com.backend.gcp.controller;

import com.backend.gcp.model.AuditLog;
import com.backend.gcp.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService service;

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAll(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        if (entityType != null && action != null) return ResponseEntity.ok(service.findByEntityTypeAndAction(entityType, action));
        if (entityType != null) return ResponseEntity.ok(service.findByEntityType(entityType));
        if (action != null) return ResponseEntity.ok(service.findByAction(action));
        if (startDate != null && endDate != null) return ResponseEntity.ok(service.findByDateRange(startDate, endDate));
        return ResponseEntity.ok(service.findRecent());
    }
}
