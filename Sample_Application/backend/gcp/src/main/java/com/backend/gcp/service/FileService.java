package com.backend.gcp.service;

import com.backend.gcp.exception.ResourceNotFoundException;
import com.backend.gcp.model.FileMetadata;
import com.backend.gcp.repository.FileMetadataRepository;
import com.google.cloud.storage.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final FileMetadataRepository repository;
    private final Storage storage;

    @Value("${app.storage.bucket-name:gcp-practice-storage}")
    private String bucketName;

    @PostConstruct
    public void initBucket() {
        try {
            Bucket bucket = storage.get(bucketName);
            if (bucket != null) {
                log.info("Bucket {} already exists.", bucketName);
            } else {
                log.info("Creating bucket {}", bucketName);
                storage.create(BucketInfo.of(bucketName));
            }
        } catch (StorageException e) {
            log.info("Creating bucket {}", bucketName);
            try {
                storage.create(BucketInfo.of(bucketName));
            } catch (Exception ex) {
                log.error("Failed to create bucket: {}", ex.getMessage());
            }
        }
    }

    public List<FileMetadata> findAll() {
        return repository.findAll();
    }

    public FileMetadata findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("File", "id", id));
    }

    public List<FileMetadata> search(String query) {
        return repository.search(query);
    }

    public FileMetadata upload(MultipartFile file, String uploadedBy, String description) throws IOException {
        String gcsObjectName = UUID.randomUUID() + "_" + file.getOriginalFilename();

        BlobId blobId = BlobId.of(bucketName, gcsObjectName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(file.getContentType())
                .build();

        storage.create(blobInfo, file.getBytes());

        FileMetadata metadata = FileMetadata.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .uploadedBy(uploadedBy)
                .gcsObjectName(gcsObjectName)
                .url("/api/files/download/" + gcsObjectName)
                .description(description)
                .storageType("GCS")
                .build();

        return repository.save(metadata);
    }

    public byte[] download(String gcsObjectName) {
        try {
            BlobId blobId = BlobId.of(bucketName, gcsObjectName);
            Blob blob = storage.get(blobId);
            if (blob == null) {
                throw new ResourceNotFoundException("File", "gcsObjectName", gcsObjectName);
            }
            return blob.getContent();
        } catch (StorageException e) {
            throw new ResourceNotFoundException("File", "gcsObjectName", gcsObjectName);
        }
    }

    public void delete(Long id) {
        FileMetadata metadata = findById(id);

        try {
            BlobId blobId = BlobId.of(bucketName, metadata.getGcsObjectName());
            storage.delete(blobId);
        } catch (StorageException e) {
            log.warn("Could not delete from GCS: {}", e.getMessage());
        }

        repository.delete(metadata);
    }
}
