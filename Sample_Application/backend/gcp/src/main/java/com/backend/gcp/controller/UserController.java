package com.backend.gcp.controller;

import com.backend.gcp.model.User;
import com.backend.gcp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    @GetMapping
    public ResponseEntity<List<User>> getAll(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String city) {
        if (role != null) return ResponseEntity.ok(service.findByRole(role));
        if (city != null) return ResponseEntity.ok(service.findByCity(city));
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<User>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @Valid @RequestBody User user) {
        return ResponseEntity.ok(service.update(id, user));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<User> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
