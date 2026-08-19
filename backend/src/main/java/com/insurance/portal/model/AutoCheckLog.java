package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "auto_check_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoCheckLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** AUTO_VERIFY | REMINDER | PAYMENT_CONFIRM */
    @Column(nullable = false, length = 30)
    private String checkType;

    /** SUCCESS | PARTIAL | SKIPPED | ERROR */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private int totalChecked;
    private int affectedCount;

    /** Whether Spring AI was used to generate messages */
    @Builder.Default
    private boolean aiAssisted = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Column(columnDefinition = "TEXT")
    private String details;
}
