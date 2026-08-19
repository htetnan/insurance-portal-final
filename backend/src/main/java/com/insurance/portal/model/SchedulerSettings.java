package com.insurance.portal.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Singleton row (id = 1) that stores runtime-editable scheduler settings.
 * On first boot, DynamicSchedulerService seeds this row from application.properties defaults.
 */
@Entity
@Table(name = "scheduler_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchedulerSettings {

    @Id
    private Long id = 1L;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    /** Cron for auto-verify payment job (UTC).  Default: 9:00 AM Myanmar = 02:30 UTC */
    @Column(name = "verify_cron", nullable = false)
    @Builder.Default
    private String verifyCron = "0 30 2 * * *";

    /** Cron for premium due reminder job (UTC).  Default: 8:00 AM Myanmar = 01:30 UTC */
    @Column(name = "reminder_cron", nullable = false)
    @Builder.Default
    private String reminderCron = "0 30 1 * * *";

    /** Cron for revision-cleanup job (UTC).  Default: 03:00 UTC daily */
    @Column(name = "revision_cleanup_cron", nullable = false)
    @Builder.Default
    private String revisionCleanupCron = "0 0 3 * * *";

    /** Minimum hours a payment must stay PENDING before auto-verify */
    @Column(name = "min_pending_hours", nullable = false)
    @Builder.Default
    private int minPendingHours = 1;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
