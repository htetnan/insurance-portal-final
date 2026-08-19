package com.insurance.portal.controller;

import com.insurance.portal.model.AutoCheckLog;
import com.insurance.portal.model.SchedulerSettings;
import com.insurance.portal.repository.AutoCheckLogRepository;
import com.insurance.portal.service.AutoCheckService;
import com.insurance.portal.service.DynamicSchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/autocheck")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminAutoCheckController {

    private final AutoCheckService        autoCheckService;
    private final AutoCheckLogRepository  logRepo;
    private final DynamicSchedulerService dynamicScheduler;

    @Value("${OPENAI_API_KEY:}")
    private String openAiKey;

    // ── Status / settings ────────────────────────────────────────────
    @GetMapping("/status")
    @Transactional(readOnly = true)
    public Map<String, Object> getStatus() {
        SchedulerSettings s = dynamicScheduler.getSettings();

        ZoneId myanmarTz = ZoneId.of("Asia/Yangon");
        ZonedDateTime nowMM = ZonedDateTime.now(myanmarTz);

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("enabled",             s.isEnabled());
        r.put("aiEnabled",           isAiEnabled());
        r.put("verifyCron",          s.getVerifyCron());
        r.put("reminderCron",        s.getReminderCron());
        r.put("revisionCleanupCron", s.getRevisionCleanupCron());
        r.put("minPendingHours",     s.getMinPendingHours());
        r.put("currentTimeMM",       nowMM.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        r.put("settingsUpdatedAt",   s.getUpdatedAt());

        Map<String, Object> lastRuns = new LinkedHashMap<>();
        for (String type : List.of("AUTO_VERIFY", "REMINDER", "REVISION_CLEANUP")) {
            logRepo.findTop1ByCheckTypeOrderByCreatedAtDesc(type).stream().findFirst()
                    .ifPresentOrElse(l -> lastRuns.put(type, Map.of(
                            "status",        l.getStatus(),
                            "summary",       l.getSummary() != null ? l.getSummary() : "",
                            "totalChecked",  l.getTotalChecked(),
                            "affectedCount", l.getAffectedCount(),
                            "aiAssisted",    l.isAiAssisted(),
                            "createdAt",     l.getCreatedAt()
                    )), () -> lastRuns.put(type, null));
        }
        r.put("lastRuns", lastRuns);

        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        r.put("todayVerified",  logRepo.countByCheckTypeAndCreatedAtAfter("AUTO_VERIFY",      todayStart));
        r.put("todayReminders", logRepo.countByCheckTypeAndCreatedAtAfter("REMINDER",         todayStart));
        r.put("todayCleanups",  logRepo.countByCheckTypeAndCreatedAtAfter("REVISION_CLEANUP", todayStart));

        return r;
    }

    // ── Update settings ───────────────────────────────────────────────
    @PutMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, Object> body) {
        try {
            // Validate cron expressions before applying
            String verifyCron          = (String) body.get("verifyCron");
            String reminderCron        = (String) body.get("reminderCron");
            String revisionCleanupCron = (String) body.get("revisionCleanupCron");

            for (Map.Entry<String, String> e : Map.of(
                    "verifyCron", verifyCron != null ? verifyCron : "",
                    "reminderCron", reminderCron != null ? reminderCron : "",
                    "revisionCleanupCron", revisionCleanupCron != null ? revisionCleanupCron : ""
            ).entrySet()) {
                if (!e.getValue().isBlank()) {
                    try {
                        CronExpression.parse(e.getValue());
                    } catch (Exception ex) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("message", e.getKey() + " တွင် cron expression မှားနေသည်: " + ex.getMessage()));
                    }
                }
            }

            SchedulerSettings patch = new SchedulerSettings();
            patch.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
            patch.setVerifyCron(verifyCron != null ? verifyCron : "0 30 2 * * *");
            patch.setReminderCron(reminderCron != null ? reminderCron : "0 30 1 * * *");
            patch.setRevisionCleanupCron(revisionCleanupCron != null ? revisionCleanupCron : "0 0 3 * * *");
            patch.setMinPendingHours(body.containsKey("minPendingHours")
                    ? ((Number) body.get("minPendingHours")).intValue() : 1);

            SchedulerSettings saved = dynamicScheduler.updateSettings(patch);
            return ResponseEntity.ok(Map.of(
                    "message", "✅ Scheduler ဆက်တင်များ သိမ်းဆည်းပြီး အသစ် reschedule လုပ်ပြီးပါပြီ",
                    "settings", Map.of(
                            "enabled",             saved.isEnabled(),
                            "verifyCron",          saved.getVerifyCron(),
                            "reminderCron",        saved.getReminderCron(),
                            "revisionCleanupCron", saved.getRevisionCleanupCron(),
                            "minPendingHours",     saved.getMinPendingHours()
                    )
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Settings update မအောင်မြင်ပါ: " + e.getMessage()));
        }
    }

    // ── Recent logs ───────────────────────────────────────────────────
    @GetMapping("/logs")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLogs(@RequestParam(defaultValue = "ALL") String type) {
        List<AutoCheckLog> logs = "ALL".equals(type)
                ? logRepo.findTop50ByOrderByCreatedAtDesc()
                : logRepo.findByCheckTypeOrderByCreatedAtDesc(type);
        return logs.stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",            l.getId());
            m.put("checkType",     l.getCheckType());
            m.put("status",        l.getStatus());
            m.put("summary",       l.getSummary());
            m.put("totalChecked",  l.getTotalChecked());
            m.put("affectedCount", l.getAffectedCount());
            m.put("aiAssisted",    l.isAiAssisted());
            m.put("createdAt",     l.getCreatedAt());
            // Parse details JSON for display
            try {
                if (l.getDetails() != null && !l.getDetails().isBlank()) {
                    m.put("details", new com.fasterxml.jackson.databind.ObjectMapper()
                            .readValue(l.getDetails(), List.class));
                }
            } catch (Exception ignored) {}
            return m;
        }).collect(Collectors.toList());
    }

    // ── Manual triggers ───────────────────────────────────────────────
    @PostMapping("/run/verify")
    @Transactional
    public ResponseEntity<?> triggerVerify() {
        try {
            Map<String, Object> result = autoCheckService.triggerVerification();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/run/reminders")
    @Transactional
    public ResponseEntity<?> triggerReminders() {
        try {
            Map<String, Object> result = autoCheckService.triggerReminders();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    private boolean isAiEnabled() {
        return openAiKey != null && !openAiKey.isBlank() && !openAiKey.startsWith("sk-placeholder");
    }
}
