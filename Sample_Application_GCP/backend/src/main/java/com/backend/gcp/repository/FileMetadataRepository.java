package com.backend.gcp.repository;

import com.backend.gcp.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    Optional<FileMetadata> findByGcsObjectName(String gcsObjectName);
    List<FileMetadata> findByFileType(String fileType);
    List<FileMetadata> findByUploadedBy(String uploadedBy);
    List<FileMetadata> findByStorageType(String storageType);

    @Query("SELECT f FROM FileMetadata f WHERE LOWER(f.fileName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<FileMetadata> search(@Param("q") String query);
}
