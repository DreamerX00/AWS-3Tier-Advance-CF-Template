package com.backend.gcp.controller;

import com.backend.gcp.model.Task;
import com.backend.gcp.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService service;

    @GetMapping
    public ResponseEntity<List<Task>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        if (status != null && priority != null) return ResponseEntity.ok(service.findByStatusAndPriority(status, priority));
        if (status != null) return ResponseEntity.ok(service.findByStatus(status));
        if (priority != null) return ResponseEntity.ok(service.findByPriority(priority));
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Task>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<Task> create(@Valid @RequestBody Task task) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(task));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable Long id, @Valid @RequestBody Task task) {
        return ResponseEntity.ok(service.update(id, task));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Task> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
