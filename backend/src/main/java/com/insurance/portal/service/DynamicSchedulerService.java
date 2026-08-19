package com.insurance.portal.service;

import com.insurance.portal.model.SchedulerSettings;
import com.insurance.portal.repository.SchedulerSettingsRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Manages the three auto-check scheduled tasks at runtime.
 * Settings are persisted in the scheduler_settings table (singleton row id=1).
 * Calling updateSettings() immediately reschedules all tasks with the new cron.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DynamicSchedulerService {

    private final TaskScheduler             taskScheduler;
    private final SchedulerSettingsRepository settingsRepo;
    private final AutoCheckService          autoCheckService;

    // Seeds defaults from application.properties on first boot
    @Value("${app.autocheck.verify-cron:0 30 2 * * *}")
    private String defaultVerifyCron;

    @Value("${app.autocheck.reminder-cron:0 30 1 * * *}")
    private String defaultReminderCron;

    @Value("${app.autocheck.revision-cleanup-cron:0 0 3 * * *}")
    private String defaultRevisionCleanupCron;

    @Value("${app.autocheck.enabled:true}")
    private boolean defaultEnabled;

    @Value("${app.autocheck.min-pending-hours:1}")
    private int defaultMinPendingHours;

    private final Map<String, ScheduledFuture<?>> futures = new ConcurrentHashMap<>();

    @PostConstruct
    @Transactional
    public void init() {
        // Seed the singleton row on first boot
        if (!settingsRepo.existsById(1L)) {
            SchedulerSettings defaults = SchedulerSettings.builder()
                    .id(1L)
                    .enabled(defaultEnabled)
                    .verifyCron(defaultVerifyCron)
                    .reminderCron(defaultReminderCron)
                    .revisionCleanupCron(defaultRevisionCleanupCron)
                    .minPendingHours(defaultMinPendingHours)
                    .build();
            settingsRepo.save(defaults);
            log.info("[Scheduler] Seeded default scheduler settings from application.properties");
        }

        SchedulerSettings s = settingsRepo.findById(1L).orElseThrow();
        rescheduleAll(s);
    }

    /** Returns the current persisted settings. */
    @Transactional(readOnly = true)
    public SchedulerSettings getSettings() {
        return settingsRepo.findById(1L).orElseThrow();
    }

    /** Persists new settings and immediately reschedules all tasks. */
    @Transactional
    public SchedulerSettings updateSettings(SchedulerSettings patch) {
        SchedulerSettings s = settingsRepo.findById(1L).orElseThrow();
        s.setEnabled(patch.isEnabled());
        s.setVerifyCron(patch.getVerifyCron());
        s.setReminderCron(patch.getReminderCron());
        s.setRevisionCleanupCron(patch.getRevisionCleanupCron());
        s.setMinPendingHours(patch.getMinPendingHours());
        SchedulerSettings saved = settingsRepo.save(s);

        rescheduleAll(saved);
        log.info("[Scheduler] Settings updated and tasks rescheduled");
        return saved;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private void rescheduleAll(SchedulerSettings s) {
        cancelAll();
        if (!s.isEnabled()) {
            log.info("[Scheduler] Auto-check disabled — no tasks scheduled");
            return;
        }

        schedule("AUTO_VERIFY",       s.getVerifyCron(),        autoCheckService::runDailyPaymentVerification);
        schedule("REMINDER",          s.getReminderCron(),       autoCheckService::runDailyPremiumReminders);
        schedule("REVISION_CLEANUP",  s.getRevisionCleanupCron(), autoCheckService::runRevisionCleanup);
    }

    private void schedule(String name, String cron, Runnable task) {
        try {
            ScheduledFuture<?> f = taskScheduler.schedule(task, new CronTrigger(cron));
            futures.put(name, f);
            log.info("[Scheduler] Scheduled {} with cron '{}'", name, cron);
        } catch (Exception e) {
            log.error("[Scheduler] Failed to schedule {}: {}", name, e.getMessage());
        }
    }

    private void cancelAll() {
        futures.forEach((name, f) -> {
            if (f != null && !f.isCancelled()) {
                f.cancel(false);
                log.debug("[Scheduler] Cancelled task {}", name);
            }
        });
        futures.clear();
    }
}
