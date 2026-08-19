package com.insurance.portal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurance.portal.model.*;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import com.insurance.portal.util.PremiumScheduleUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoCheckService {

    private final PaymentRepository           paymentRepo;
    private final PolicyApplicationRepository appRepo;
    private final ClaimRepository             claimRepo;
    private final NotificationRepository      notifRepo;
    private final AutoCheckLogRepository      logRepo;
    private final ObjectMapper                objectMapper;
    private final RestTemplate                restTemplate;

    @Value("${OPENAI_API_KEY:}")
    private String openAiApiKey;

    private final SchedulerSettingsRepository schedulerSettingsRepo;

    /** Fetches scheduler settings once; callers use the returned object for all fields. */
    private SchedulerSettings getSchedulerSettings() {
        return schedulerSettingsRepo.findById(1L).orElse(null);
    }

    private boolean isEnabled() {
        SchedulerSettings s = getSchedulerSettings();
        return s == null || s.isEnabled();
    }

    private int getMinPendingHours() {
        SchedulerSettings s = getSchedulerSettings();
        return s != null ? s.getMinPendingHours() : 1;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. AUTO-VERIFY PENDING PAYMENTS  —  scheduled via DynamicSchedulerService
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public void runDailyPaymentVerification() {
        if (!isEnabled()) { log.info("[AutoCheck] Disabled — skipping verification"); return; }
        log.info("[AutoCheck] ▶ Daily payment auto-verification started");

        List<Map<String, Object>> results = new ArrayList<>();
        int verified = 0, skipped = 0, errors = 0;

        List<Payment> pending = paymentRepo.findAllByStatus(PaymentStatus.PENDING);
        LocalDateTime cutoff  = LocalDateTime.now().minusHours(getMinPendingHours());

        for (Payment p : pending) {
            try {
                Map<String, Object> r = verifyPayment(p, cutoff);
                results.add(r);
                String outcome = (String) r.get("outcome");
                if ("VERIFIED".equals(outcome)) verified++;
                else if ("SKIPPED".equals(outcome))  skipped++;
                else errors++;
            } catch (Exception e) {
                log.error("[AutoCheck] Payment {} error: {}", p.getId(), e.getMessage());
                results.add(Map.of("paymentId", p.getId(), "outcome", "ERROR", "reason", e.getMessage()));
                errors++;
            }
        }

        saveLog("AUTO_VERIFY",
                verified > 0 ? "SUCCESS" : (errors > 0 ? "PARTIAL" : "SKIPPED"),
                String.format("စစ်ဆေးပြီး: %d | အတည်ပြုပြီး: %d | ကျော်သွား: %d | အမှား: %d",
                        pending.size(), verified, skipped, errors),
                pending.size(), verified, results);

        log.info("[AutoCheck] ✅ Verification complete — verified={} skipped={} errors={}", verified, skipped, errors);
    }

    @Transactional
    public Map<String, Object> verifyPayment(Payment p, LocalDateTime cutoff) {
        if (p.getStatus() != PaymentStatus.PENDING)
            return Map.of("paymentId", p.getId(), "outcome", "SKIPPED", "reason", "Not PENDING");

        // Must have waited min-pending-hours (gives admin time to flag suspicious payments)
        if (p.getCreatedAt() != null && p.getCreatedAt().isAfter(cutoff))
            return Map.of("paymentId", p.getId(), "outcome", "SKIPPED",
                    "reason", "Too recent (< " + getMinPendingHours() + "h)");

        PolicyApplication app = p.getApplication();
        if (app == null || app.getStatus() != ApplicationStatus.APPROVED)
            return Map.of("paymentId", p.getId(), "outcome", "SKIPPED",
                    "reason", "Application not APPROVED");

        if (p.getScreenshotPath() == null || p.getScreenshotPath().isBlank())
            return Map.of("paymentId", p.getId(), "outcome", "SKIPPED",
                    "reason", "No payment screenshot uploaded");

        // Amount must match expected installment (within 1% tolerance)
        BigDecimal expected = expectedInstallmentAmount(app);
        if (expected != null && p.getAmount() != null) {
            BigDecimal diff      = p.getAmount().subtract(expected).abs();
            BigDecimal tolerance = expected.multiply(BigDecimal.valueOf(0.01));
            if (diff.compareTo(tolerance) > 0)
                return Map.of("paymentId", p.getId(), "outcome", "SKIPPED",
                        "reason", String.format("Amount mismatch: paid=%s expected=%s", p.getAmount(), expected));
        }

        // ✅ All checks passed — auto-verify
        p.setStatus(PaymentStatus.VERIFIED);
        p.setVerifiedBy("AutoCheck System (AI-assisted)");
        paymentRepo.save(p);

        String customerName = p.getCustomer() != null ? p.getCustomer().getName() : "Customer";
        String policyName   = app.getInsurancePackage() != null ? app.getInsurancePackage().getName() : "Policy";
        String periodInfo   = p.getPeriodLabel() != null ? " (" + p.getPeriodLabel() + ")" : "";
        String amount       = p.getAmount() != null ? p.getAmount().toPlainString() : "";

        String message = generateAiMessage("payment_confirmed", customerName,
                Map.of("policyName", policyName, "amount", amount, "period", periodInfo.trim()),
                String.format("%s အတွက်%s ပေးချေငွေ %s MMK ကို စနစ်မှ အလိုအလျောက် အတည်ပြုပြီးပါပြီ။ " +
                        "ပါလစီဆိုင်ရာ အကျိုးခံစားခွင့်များ ဆက်လက်ရရှိနိုင်ပါပြီ။", policyName, periodInfo, amount));

        sendNotification(p.getCustomer(),
                "✅ ငွေပေးချေမှု အတည်ပြုပြီး",
                message, NotificationType.PAYMENT);

        log.info("[AutoCheck] ✅ Verified payment {} for {}", p.getId(), customerName);
        return Map.of("paymentId", p.getId(), "outcome", "VERIFIED",
                "customer", customerName, "amount", amount, "policy", policyName);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. PREMIUM DUE REMINDERS  —  scheduled via DynamicSchedulerService
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public void runDailyPremiumReminders() {
        if (!isEnabled()) { log.info("[AutoCheck] Disabled — skipping reminders"); return; }
        log.info("[AutoCheck] ▶ Daily premium reminders started");

        List<PolicyApplication> approvedApps = appRepo.findAllByStatus(ApplicationStatus.APPROVED);
        List<Map<String, Object>> results = new ArrayList<>();
        int reminded = 0;

        LocalDate today      = LocalDate.now();
        LocalDate tomorrow   = today.plusDays(1);
        LocalDate twoDays    = today.plusDays(2);

        for (PolicyApplication app : approvedApps) {
            try {
                List<Payment> payments = paymentRepo.findAllByApplication_Id(app.getId());
                var schedule = PremiumScheduleUtil.buildSchedule(app, payments);

                for (var entry : schedule.getSchedule()) {
                    LocalDate due = entry.getDueDate();
                    if (due == null) continue;

                    boolean isDueSoon = due.equals(twoDays) || due.equals(tomorrow) || due.equals(today);
                    boolean isOverdue = "OVERDUE".equals(entry.getStatus());
                    boolean needsPay  = "DUE".equals(entry.getStatus())
                            || "UPCOMING".equals(entry.getStatus()) || isOverdue;

                    if (!needsPay) continue;
                    if (!isDueSoon && !isOverdue) continue;

                    User customer = app.getCustomer();
                    if (customer == null) continue;

                    // Avoid duplicate reminders sent today
                    String dedupKey = "Period " + entry.getPeriodNumber() + " — "
                            + (app.getPolicyNumber() != null ? app.getPolicyNumber() : app.getId());
                    boolean alreadyReminded = notifRepo.existsByRecipientAndTitleContainingAndCreatedAtAfter(
                            customer, dedupKey,
                            LocalDateTime.now().withHour(0).withMinute(0).withSecond(0));
                    if (alreadyReminded) continue;

                    String customerName = customer.getName();
                    String policyName   = schedule.getPackageName() != null ? schedule.getPackageName() : "Policy";
                    String amount       = entry.getAmount() != null ? entry.getAmount().toPlainString() : "";
                    String periodLabel  = entry.getPeriodLabel() != null ? entry.getPeriodLabel() : "";
                    String dueStr       = due.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    String urgency      = isOverdue ? "OVERDUE"
                            : due.equals(today) ? "TODAY"
                            : due.equals(tomorrow) ? "TOMORROW" : "2 DAYS";

                    String message = generateAiMessage("payment_reminder", customerName,
                            Map.of("policyName", policyName, "amount", amount,
                                    "dueDate", dueStr, "period", periodLabel, "urgency", urgency),
                            buildReminderFallback(urgency, policyName, periodLabel, amount, dueStr));

                    String title = (isOverdue ? "⚠️ ငွေပေးချေမှု သတ်မှတ်ရက်ကျော်"
                            : "🔔 ငွေပေးချေ သတိပေးချက်") + " — " + policyName
                            + " | " + dedupKey;

                    sendNotification(customer, title, message, NotificationType.REMINDER);
                    reminded++;

                    results.add(Map.of("customerName", customerName,
                            "policy", policyName, "period", periodLabel,
                            "dueDate", dueStr, "urgency", urgency));
                    log.info("[AutoCheck] 🔔 Reminder → {} | {} {} ({})", customerName, policyName, periodLabel, urgency);
                }
            } catch (Exception e) {
                log.error("[AutoCheck] Reminder error app {}: {}", app.getId(), e.getMessage());
            }
        }

        saveLog("REMINDER",
                reminded > 0 ? "SUCCESS" : "SKIPPED",
                String.format("စစ်ဆေးပြီး: %d policies | သတိပေးပြီး: %d ကြိမ်", approvedApps.size(), reminded),
                approvedApps.size(), reminded, results);

        log.info("[AutoCheck] ✅ Reminders complete — sent={}", reminded);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. AUTO-CANCEL REVISION_REQUESTED FORMS — scheduled via DynamicSchedulerService
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public void runRevisionCleanup() {
        if (!isEnabled()) { log.info("[AutoCheck] Disabled — skipping revision cleanup"); return; }
        log.info("[AutoCheck] ▶ Revision cleanup started");

        LocalDateTime now = LocalDateTime.now();
        int cancelledApps = 0, cancelledClaims = 0;
        List<Map<String, Object>> results = new ArrayList<>();

        // --- Applications ---
        List<PolicyApplication> revisionApps = appRepo.findAllByStatus(ApplicationStatus.REVISION_REQUESTED);
        for (PolicyApplication app : revisionApps) {
            if (app.getRevisionDeadline() == null || now.isBefore(app.getRevisionDeadline())) continue;
            app.setStatus(ApplicationStatus.REJECTED);
            app.setAdminNote((app.getAdminNote() != null ? app.getAdminNote() + " | " : "")
                    + "Auto-cancelled: Customer did not respond within 7 days.");
            appRepo.save(app);
            cancelledApps++;
            String customerName = app.getCustomer() != null ? app.getCustomer().getName() : "Customer";
            String policyName   = app.getInsurancePackage() != null ? app.getInsurancePackage().getName() : "Policy";
            sendNotification(app.getCustomer(),
                    "❌ Application Auto-Cancelled",
                    String.format("%s Application ကို 7 ရက်အတွင်း ပြင်ဆင်မပေးသောကြောင့် " +
                            "System မှ အလိုအလျောက် ပယ်ချလိုက်ပါသည်။ (Policy: %s)", customerName, policyName),
                    NotificationType.REJECTION);
            results.add(Map.of("type", "APPLICATION", "id", app.getId(), "customer", customerName, "policy", policyName));
            log.info("[AutoCheck] ❌ Auto-cancelled application #{} for {}", app.getId(), customerName);
        }

        // --- Claims ---
        List<Claim> revisionClaims = claimRepo.findAllByStatus(ClaimStatus.REVISION_REQUESTED);
        for (Claim claim : revisionClaims) {
            if (claim.getRevisionDeadline() == null || now.isBefore(claim.getRevisionDeadline())) continue;
            claim.setStatus(com.insurance.portal.model.enums.ClaimStatus.REJECTED);
            claim.setAdminNote((claim.getAdminNote() != null ? claim.getAdminNote() + " | " : "")
                    + "Auto-cancelled: Customer did not respond within 7 days.");
            claimRepo.save(claim);
            cancelledClaims++;
            String customerName = claim.getCustomer() != null ? claim.getCustomer().getName() : "Customer";
            sendNotification(claim.getCustomer(),
                    "❌ Claim Auto-Cancelled",
                    String.format("%s Claim ကို 7 ရက်အတွင်း ပြင်ဆင်မပေးသောကြောင့် " +
                            "System မှ အလိုအလျောက် ပယ်ချလိုက်ပါသည်။ Claim ID: #%d", customerName, claim.getId()),
                    NotificationType.REJECTION);
            results.add(Map.of("type", "CLAIM", "id", claim.getId(), "customer", customerName));
            log.info("[AutoCheck] ❌ Auto-cancelled claim #{} for {}", claim.getId(), customerName);
        }

        int total = cancelledApps + cancelledClaims;
        saveLog("REVISION_CLEANUP",
                total > 0 ? "SUCCESS" : "SKIPPED",
                String.format("Applications ပယ်ချ: %d | Claims ပယ်ချ: %d", cancelledApps, cancelledClaims),
                revisionApps.size() + revisionClaims.size(), total, results);

        log.info("[AutoCheck] ✅ Revision cleanup complete — apps={} claims={}", cancelledApps, cancelledClaims);
    }

    @Transactional
    public Map<String, Object> triggerRevisionCleanup() {
        log.info("[AutoCheck] Manual trigger: revision cleanup");
        runRevisionCleanup();
        return logRepo.findTop1ByCheckTypeOrderByCreatedAtDesc("REVISION_CLEANUP").stream()
                .findFirst()
                .<Map<String, Object>>map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("status",  l.getStatus());
                    m.put("summary", l.getSummary() != null ? l.getSummary() : "");
                    m.put("affected", l.getAffectedCount());
                    return m;
                })
                .orElseGet(() -> Map.of("status", "DONE", "summary", ""));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Manual triggers (called from AdminAutoCheckController)
    // ──────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> triggerVerification() {
        log.info("[AutoCheck] Manual trigger: payment verification");
        List<Map<String, Object>> results = new ArrayList<>();
        int verified = 0, skipped = 0, errors = 0;
        LocalDateTime cutoff = LocalDateTime.now().minusHours(getMinPendingHours());
        for (Payment p : paymentRepo.findAllByStatus(PaymentStatus.PENDING)) {
            try {
                Map<String, Object> r = verifyPayment(p, cutoff);
                results.add(r);
                if ("VERIFIED".equals(r.get("outcome"))) verified++;
                else if ("ERROR".equals(r.get("outcome"))) errors++;
                else skipped++;
            } catch (Exception e) {
                errors++;
                results.add(Map.of("paymentId", p.getId(), "outcome", "ERROR", "reason", e.getMessage()));
            }
        }
        int total = verified + skipped + errors;
        return Map.of("total", total, "verified", verified,
                "skipped", skipped, "errors", errors, "results", results);
    }

    @Transactional
    public Map<String, Object> triggerReminders() {
        log.info("[AutoCheck] Manual trigger: premium reminders");
        runDailyPremiumReminders();
        return logRepo.findTop1ByCheckTypeOrderByCreatedAtDesc("REMINDER").stream()
                .findFirst()
                .<Map<String, Object>>map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("status",  l.getStatus());
                    m.put("summary", l.getSummary() != null ? l.getSummary() : "");
                    m.put("affected", l.getAffectedCount());
                    return m;
                })
                .orElseGet(() -> { Map<String, Object> m = new LinkedHashMap<>(); m.put("status","DONE"); m.put("summary",""); return m; });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // AI — direct OpenAI REST API call (no Spring AI library needed)
    // ──────────────────────────────────────────────────────────────────────────
    public boolean isAiAvailable() {
        return openAiApiKey != null && !openAiApiKey.isBlank();
    }

    @SuppressWarnings("unchecked")
    private String generateAiMessage(String type, String customerName,
                                      Map<String, String> ctx, String fallback) {
        if (!isAiAvailable()) return fallback;
        try {
            String system = """
                    You are a professional notification writer for a Myanmar digital insurance portal.
                    Generate concise, friendly, formal notifications in Myanmar (Burmese) language.
                    2-3 sentences only. No HTML or markdown. Address the customer by name. Be warm but professional.
                    """;
            String user = switch (type) {
                case "payment_confirmed" -> String.format(
                        "Write a payment confirmation for customer '%s'. Policy: %s. Amount: %s MMK. Period: %s. " +
                        "Payment was auto-verified by the system.",
                        customerName, ctx.get("policyName"), ctx.get("amount"), ctx.get("period"));
                case "payment_reminder" -> String.format(
                        "Write a payment reminder for customer '%s'. Policy: %s. Amount due: %s MMK. " +
                        "Due date: %s. Period: %s. Urgency level: %s. " +
                        "If OVERDUE, be gentle but stress importance.",
                        customerName, ctx.get("policyName"), ctx.get("amount"),
                        ctx.get("dueDate"), ctx.get("period"), ctx.get("urgency"));
                default -> "Write a general insurance notification for " + customerName + ".";
            };

            Map<String, Object> body = Map.of(
                    "model", "gpt-4o-mini",
                    "temperature", 0.5,
                    "messages", List.of(
                            Map.of("role", "system", "content", system),
                            Map.of("role", "user",   "content", user)
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    "https://api.openai.com/v1/chat/completions",
                    HttpMethod.POST, req, Map.class);

            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                List<?> choices = (List<?>) resp.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<?, ?> choice  = (Map<?, ?>) choices.get(0);
                    Map<?, ?> message = (Map<?, ?>) choice.get("message");
                    if (message != null) {
                        String content = (String) message.get("content");
                        if (content != null && !content.isBlank()) {
                            log.debug("[AutoCheck] AI message generated for type={}", type);
                            return content.trim();
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[AutoCheck] AI message failed for type={}: {}", type, e.getMessage());
        }
        return fallback;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────
    private BigDecimal expectedInstallmentAmount(PolicyApplication app) {
        if (app.getInsurancePackage() == null) return app.getPremiumAmount();
        Integer interval  = app.getInsurancePackage().getPaymentIntervalMonths();
        int     duration  = app.getDuration() != null ? app.getDuration() : 1;
        if (interval == null || interval <= 0) return app.getPremiumAmount();
        int total = Math.max((duration * 12) / interval, 1);
        BigDecimal premium = app.getPremiumAmount();
        if (premium == null) return null;
        return premium.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private String buildReminderFallback(String urgency, String policy,
                                          String period, String amount, String dueDate) {
        String p = period.isBlank() ? "" : " (" + period + ")";
        return switch (urgency) {
            case "OVERDUE"  -> String.format(
                    "%s အာမခံ%s ငွေပေးချေရမည့်ရက် (%s) ကျော်လွန်နေပါပြီ။ " +
                    "ပမာဏ: %s MMK — ချက်ချင်းပေးသွင်းပါ။ " +
                    "ပါလစီ အကျိုးခံစားခွင့်များ ထိခိုက်နိုင်သည်။", policy, p, dueDate, amount);
            case "TODAY"    -> String.format(
                    "%s အာမခံ%s ငွေပေးချေရမည့်ရက် ယနေ့ (%s) ဖြစ်ပါသည်။ " +
                    "ပမာဏ: %s MMK — ယနေ့ပင် ပေးသွင်းပါ။", policy, p, dueDate, amount);
            case "TOMORROW" -> String.format(
                    "%s အာမခံ%s ငွေပေးချေရမည့်ရက် မနက်ဖြန် (%s) ဖြစ်ပါသည်။ " +
                    "ပမာဏ: %s MMK — ကြိုတင်ပြင်ဆင်ထားပါ။", policy, p, dueDate, amount);
            default         -> String.format(
                    "%s အာမခံ%s ငွေပေးချေရမည့်ရက်မှာ ၂ ရက်အတွင်း (%s) ဖြစ်ပါသည်။ " +
                    "ပမာဏ: %s MMK — ကြိုတင်ပေးသွင်းနိုင်ပါသည်။", policy, p, dueDate, amount);
        };
    }

    private void sendNotification(User recipient, String title, String message, NotificationType type) {
        if (recipient == null) return;
        notifRepo.save(Notification.builder()
                .recipient(recipient).title(title).message(message).type(type).build());
    }

    private void saveLog(String checkType, String status, String summary,
                          int total, int affected, List<Map<String, Object>> details) {
        try {
            logRepo.save(AutoCheckLog.builder()
                    .checkType(checkType).status(status).summary(summary)
                    .totalChecked(total).affectedCount(affected)
                    .aiAssisted(isAiAvailable())
                    .details(objectMapper.writeValueAsString(details))
                    .build());
        } catch (Exception e) {
            log.error("[AutoCheck] Failed to save log: {}", e.getMessage());
        }
    }
}
