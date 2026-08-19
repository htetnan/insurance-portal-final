package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "insurance_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsuranceType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String name;

    /** Short explanation shown on the home page and plans page */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Key benefits, one per line or comma-separated */
    @Column(columnDefinition = "TEXT")
    private String benefits;

    /** Rules and regulations / terms */
    @Column(columnDefinition = "TEXT")
    private String rules;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
