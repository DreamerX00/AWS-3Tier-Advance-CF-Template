package com.backend.gcp.controller;

import com.backend.gcp.model.Product;
import com.backend.gcp.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService service;

    @GetMapping
    public ResponseEntity<List<Product>> getAll(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer lowStock) {
        if (category != null) return ResponseEntity.ok(service.findByCategory(category));
        if (minPrice != null && maxPrice != null) return ResponseEntity.ok(service.findByPriceRange(minPrice, maxPrice));
        if (lowStock != null) return ResponseEntity.ok(service.findLowStock(lowStock));
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Product>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody Product product) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@PathVariable Long id, @Valid @RequestBody Product product) {
        return ResponseEntity.ok(service.update(id, product));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Product> patch(@PathVariable Long id, @RequestBody Map<String, Object> fields) {
        return ResponseEntity.ok(service.patch(id, fields));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
