package com.backend.gcp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String entityType;

    private Long entityId;

    @Column(nullable = false)
    private String action;

    private String performedBy;

    @Column(columnDefinition = "TEXT")
    private String details;

    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime timestamp;
}
