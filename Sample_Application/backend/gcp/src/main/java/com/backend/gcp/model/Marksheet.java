package com.backend.gcp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "marksheets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Marksheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Student name is required")
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String studentName;

    @NotBlank(message = "Roll number is required")
    @Column(nullable = false, unique = true)
    private String rollNumber;

    @NotBlank(message = "Subject is required")
    @Column(nullable = false)
    private String subject;

    @NotNull(message = "Marks are required")
    @Min(value = 0, message = "Marks cannot be negative")
    @Max(value = 100, message = "Marks cannot exceed 100")
    @Column(nullable = false)
    private Integer marks;

    @Size(max = 5)
    private String grade;

    @NotNull(message = "Semester is required")
    @Min(1) @Max(8)
    private Integer semester;

    @NotNull(message = "Year is required")
    @Min(2000) @Max(2030)
    private Integer year;

    private String remarks;
}
