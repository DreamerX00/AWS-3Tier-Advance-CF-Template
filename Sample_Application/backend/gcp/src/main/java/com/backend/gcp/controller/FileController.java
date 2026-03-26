package com.backend.gcp.controller;

import com.backend.gcp.model.FileMetadata;
import com.backend.gcp.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService service;

    @GetMapping
    public ResponseEntity<List<FileMetadata>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FileMetadata> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<FileMetadata>> search(@RequestParam String q) {
        return ResponseEntity.ok(service.search(q));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileMetadata> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String uploadedBy,
            @RequestParam(required = false) String description) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.upload(file, uploadedBy, description));
    }

    @GetMapping("/download/{gcsObjectName}")
    public ResponseEntity<byte[]> download(@PathVariable String gcsObjectName) throws IOException {
        FileMetadata metadata = service.findAll().stream()
                .filter(f -> f.getGcsObjectName().equals(gcsObjectName))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("File not found"));

        byte[] data = service.download(gcsObjectName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(metadata.getFileType()))
                .body(data);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) throws IOException {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
