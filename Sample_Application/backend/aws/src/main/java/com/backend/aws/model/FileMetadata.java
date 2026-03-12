package com.backend.aws.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "file_metadata")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FileMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "File name is required")
    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private Long fileSize;

    private String uploadedBy;

    @Column(unique = true)
    private String s3Key;

    private String url;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String storageType = "LOCAL";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
