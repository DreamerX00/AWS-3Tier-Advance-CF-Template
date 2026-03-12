package com.backend.aws.service;

import com.backend.aws.exception.ResourceNotFoundException;
import com.backend.aws.model.FileMetadata;
import com.backend.aws.repository.FileMetadataRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final FileMetadataRepository repository;
    private final S3Client s3Client;

    private static final String BUCKET_NAME = "aws-practice-storage";

    @PostConstruct
    public void initBucket() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(BUCKET_NAME).build());
            log.info("Bucket {} already exists.", BUCKET_NAME);
        } catch (S3Exception e) {
            log.info("Creating bucket {}", BUCKET_NAME);
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(BUCKET_NAME).build());
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
        String s3Key = UUID.randomUUID() + "_" + file.getOriginalFilename();

        PutObjectRequest putOb = PutObjectRequest.builder()
                .bucket(BUCKET_NAME)
                .key(s3Key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putOb, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        FileMetadata metadata = FileMetadata.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .uploadedBy(uploadedBy)
                .s3Key(s3Key)
                .url("/api/files/download/" + s3Key)
                .description(description)
                .storageType("S3")
                .build();

        return repository.save(metadata);
    }

    public byte[] download(String s3Key) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(BUCKET_NAME)
                    .key(s3Key)
                    .build();

            ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
            return objectBytes.asByteArray();
        } catch (NoSuchKeyException e) {
            throw new ResourceNotFoundException("File", "s3Key", s3Key);
        }
    }

    public void delete(Long id) {
        FileMetadata metadata = findById(id);
        
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(BUCKET_NAME)
                .key(metadata.getS3Key())
                .build();
            s3Client.deleteObject(deleteObjectRequest);
        } catch (S3Exception e) {
            log.warn("Could not delete from S3: {}", e.getMessage());
        }

        repository.delete(metadata);
    }
}
