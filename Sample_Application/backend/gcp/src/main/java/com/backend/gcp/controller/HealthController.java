package com.backend.gcp.controller;

import com.backend.gcp.dto.SummaryDto;
import com.backend.gcp.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    private final SummaryService summaryService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        SummaryDto.SystemSummaryResponse summary = summaryService.buildSystemSummary();
        return ResponseEntity.ok(Map.of(
                "status", summary.status(),
                "timestamp", summary.generatedAt().toString(),
                "service", summary.service(),
                "components", summary.components()
        ));
    }
}
