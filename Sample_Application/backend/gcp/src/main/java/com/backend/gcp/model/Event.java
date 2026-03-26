package com.backend.gcp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Event name is required")
    @Size(min = 2, max = 200)
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotBlank(message = "Venue is required")
    @Size(max = 200)
    @Column(nullable = false)
    private String venue;

    @NotNull(message = "Date is required")
    @Column(nullable = false)
    private LocalDate date;

    private LocalTime time;

    @NotBlank(message = "Organizer is required")
    @Size(max = 100)
    @Column(nullable = false)
    private String organizer;

    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Size(max = 50)
    private String category;

    @Size(max = 500)
    private String registrationLink;
}
