package com.backend.gcp.controller;

import com.backend.gcp.dto.SummaryDto;
import com.backend.gcp.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final SummaryService summaryService;

    @GetMapping("/recent")
    public ResponseEntity<SummaryDto.ActivityRecentResponse> getRecentActivity() {
        return ResponseEntity.ok(summaryService.buildActivityRecent(12));
    }
}
