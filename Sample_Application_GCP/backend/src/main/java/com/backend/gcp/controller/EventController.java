package com.backend.gcp.controller;

import com.backend.gcp.model.Event;
import com.backend.gcp.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;

    @GetMapping
    public ResponseEntity<List<Event>> getAll(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Boolean upcoming) {
        if (upcoming != null && upcoming) return ResponseEntity.ok(service.findUpcoming());
        if (active != null && active) return ResponseEntity.ok(service.findActive());
        if (category != null) return ResponseEntity.ok(service.findByCategory(category));
        if (startDate != null && endDate != null) return ResponseEntity.ok(service.findByDateRange(startDate, endDate));
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Event>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<Event> create(@Valid @RequestBody Event event) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> update(@PathVariable Long id, @Valid @RequestBody Event event) {
        return ResponseEntity.ok(service.update(id, event));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Event> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
