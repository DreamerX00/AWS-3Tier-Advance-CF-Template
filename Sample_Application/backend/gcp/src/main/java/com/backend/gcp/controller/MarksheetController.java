package com.backend.gcp.controller;

import com.backend.gcp.model.Marksheet;
import com.backend.gcp.service.MarksheetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/marksheets")
@RequiredArgsConstructor
public class MarksheetController {

    private final MarksheetService service;

    @GetMapping
    public ResponseEntity<List<Marksheet>> getAll(
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) Integer year) {
        if (semester != null && year != null) return ResponseEntity.ok(service.findBySemesterAndYear(semester, year));
        if (semester != null) return ResponseEntity.ok(service.findBySemester(semester));
        if (year != null) return ResponseEntity.ok(service.findByYear(year));
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Marksheet> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Marksheet>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<Marksheet> create(@Valid @RequestBody Marksheet marksheet) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(marksheet));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Marksheet> update(@PathVariable Long id, @Valid @RequestBody Marksheet marksheet) {
        return ResponseEntity.ok(service.update(id, marksheet));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Marksheet> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
