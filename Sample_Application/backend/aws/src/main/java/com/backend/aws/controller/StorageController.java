package com.backend.aws.controller;

import com.backend.aws.dto.SummaryDto;
import com.backend.aws.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final SummaryService summaryService;

    @GetMapping("/summary")
    public ResponseEntity<SummaryDto.StorageSummaryResponse> getStorageSummary() {
        return ResponseEntity.ok(summaryService.buildStorageSummary(8));
    }
}
