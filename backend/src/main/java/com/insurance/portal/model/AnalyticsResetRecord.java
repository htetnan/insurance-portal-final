package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Each row records one "monthly reset" event.
 * After a reset the analytics dashboards only count data created AFTER resetAt.
 */
@Entity
@Table(name = "analytics_reset_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsResetRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The moment the reset was performed (= periodEnd of the archived report). */
    @Column(nullable = false)
    private LocalDateTime resetAt;

    /** The moment the previous reset ended (= periodStart of the archived report). Null on first-ever reset. */
    private LocalDateTime periodStart;

    /** Absolute path to the archived PDF file saved at reset time. */
    @Column(length = 1024)
    private String pdfPath;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
