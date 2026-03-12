package com.backend.aws.controller;

import com.backend.aws.model.Note;
import com.backend.aws.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService service;

    @GetMapping
    public ResponseEntity<List<Note>> getAll(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) Boolean isPublic) {
        if (category != null) return ResponseEntity.ok(service.findByCategory(category));
        if (author != null) return ResponseEntity.ok(service.findByAuthor(author));
        if (isPublic != null && isPublic) return ResponseEntity.ok(service.findPublic());
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Note> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Note>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<Note> create(@Valid @RequestBody Note note) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(note));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Note> update(@PathVariable Long id, @Valid @RequestBody Note note) {
        return ResponseEntity.ok(service.update(id, note));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Note> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
