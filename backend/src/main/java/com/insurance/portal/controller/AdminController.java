package com.insurance.portal.controller;

import com.insurance.portal.model.*;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import com.insurance.portal.service.NotificationService;
import com.insurance.portal.util.FileStorageUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurance.portal.model.enums.FormType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Admin endpoints for: Insurance Types CRUD, Dashboard Stats, Notifications.
 *
 * Applications  → AdminApplicationController
 * Claims        → AdminClaimController
 * Users         → AdminUserController
 * Reports/Wallet → AdminReportsController
 */
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepo;
    private final PolicyApplicationRepository appRepo;
    private final ClaimRepository claimRepo;
    private final PaymentRepository paymentRepo;
    private final NotificationRepository notifRepo;
    private final InsurancePackageRepository packageRepo;
    private final InsuranceTypeRepository insuranceTypeRepo;
    private final NotificationService notifService;
    private final FeedbackRepository feedbackRepo;
    private final FormTemplateRepository formTemplateRepo;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    // ── Insurance Types CRUD ──────────────────────────────────────────

    @GetMapping("/insurance-types")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listInsuranceTypes() {
        return ResponseEntity.ok(insuranceTypeRepo.findAllByOrderByNameAsc().stream()
            .map(t -> {
                Map<String, Object> m = new HashMap<>(typeToMap(t));
                m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : "");
                return m;
            })
            .toList());
    }

    @PostMapping("/insurance-types")
    @Transactional
    public ResponseEntity<?> createInsuranceType(@RequestBody Map<String, Object> body) {
        String name = body.getOrDefault("name", "").toString().trim().toUpperCase();
        if (name.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Name is required"));
        if (insuranceTypeRepo.findByNameIgnoreCase(name).isPresent())
            return ResponseEntity.status(409).body(Map.of("message", "\"" + name + "\" သည် ရှိပြီးသားဖြစ်သည်"));
        String description = body.getOrDefault("description", "").toString().trim();
        String benefits    = body.getOrDefault("benefits",    "").toString().trim();
        String rules       = body.getOrDefault("rules",       "").toString().trim();
        var saved = insuranceTypeRepo.save(InsuranceType.builder()
                .name(name)
                .description(description.isBlank() ? null : description)
                .benefits(benefits.isBlank()    ? null : benefits)
                .rules(rules.isBlank()          ? null : rules)
                .build());
        return ResponseEntity.ok(typeToMap(saved));
    }

    @PutMapping("/insurance-types/{id}")
    @Transactional
    public ResponseEntity<?> updateInsuranceType(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var type = insuranceTypeRepo.findById(id).orElse(null);
        if (type == null) return ResponseEntity.notFound().build();
        if (body.containsKey("description")) type.setDescription(body.get("description").toString().trim());
        if (body.containsKey("benefits"))    type.setBenefits(body.get("benefits").toString().trim());
        if (body.containsKey("rules"))       type.setRules(body.get("rules").toString().trim());
        return ResponseEntity.ok(typeToMap(insuranceTypeRepo.save(type)));
    }

    @DeleteMapping("/insurance-types/{id}")
    @Transactional
    public ResponseEntity<?> deleteInsuranceType(@PathVariable Long id) {
        if (!insuranceTypeRepo.existsById(id)) return ResponseEntity.notFound().build();
        insuranceTypeRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    // ── Dashboard Stats ───────────────────────────────────────────────

    @GetMapping("/dashboard/stats")
    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCustomers",        userRepo.countByRole(Role.CUSTOMER));
        stats.put("totalAgents",           userRepo.countByRole(Role.AGENT));
        stats.put("pendingApplications",   appRepo.countByStatus(ApplicationStatus.PENDING));
        stats.put("pendingClaims",         claimRepo.countByStatus(ClaimStatus.PENDING));
        stats.put("pendingPayments",       paymentRepo.countByStatus(PaymentStatus.PENDING));
        stats.put("unreadFeedback",        feedbackRepo.countByReadFalse());
        stats.put("verifiedApplications",  appRepo.countByStatus(ApplicationStatus.VERIFIED));
        stats.put("verifiedClaims",        claimRepo.countByStatus(ClaimStatus.VERIFIED));
        stats.put("totalPackages",         packageRepo.count());

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        BigDecimal monthlyRevenue = paymentRepo.monthlyVerifiedRevenueSince(startOfMonth).stream()
                .map(row -> new BigDecimal(row[1].toString()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.put("monthlyRevenue", monthlyRevenue);
        return stats;
    }

    /**
     * Supplies chronological, zero-filled monthly premium revenue to the Python
     * forecasting model using a database aggregate query rather than findAll().
     */
    @GetMapping("/dashboard/revenue-history")
    @Transactional(readOnly = true)
    public Map<String, Object> getRevenueHistory(@RequestParam(defaultValue = "24") int months) {
        int safeMonths = Math.max(3, Math.min(months, 36));
        YearMonth current = YearMonth.now();
        YearMonth first = current.minusMonths(safeMonths - 1L);
        LocalDateTime start = first.atDay(1).atStartOfDay();

        Map<YearMonth, BigDecimal> totals = zeroMoneySeries(first, safeMonths);
        for (Object[] row : paymentRepo.monthlyVerifiedRevenueSince(start)) {
            YearMonth month = YearMonth.parse(row[0].toString());
            if (totals.containsKey(month)) totals.put(month, new BigDecimal(row[1].toString()));
        }

        List<Map<String, Object>> points = totals.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> point = new LinkedHashMap<>();
                    point.put("month", entry.getKey().toString());
                    point.put("revenue", entry.getValue());
                    return point;
                })
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("currency", "MMK");
        response.put("source", "verified_premium_payments");
        response.put("points", points);
        return response;
    }

    /**
     * Aggregate histories used by the Python Prediction Center. Only monthly
     * counts leave MySQL, so this stays responsive with 15,000+ rows.
     */
    @GetMapping("/prediction/history")
    @Transactional(readOnly = true)
    public Map<String, Object> getPredictionHistory(@RequestParam(defaultValue = "24") int months) {
        int safeMonths = Math.max(3, Math.min(months, 36));
        YearMonth current = YearMonth.now();
        YearMonth first = current.minusMonths(safeMonths - 1L);
        LocalDateTime start = first.atDay(1).atStartOfDay();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("months", safeMonths);
        response.put("generatedAt", LocalDateTime.now().toString());
        response.put("applications", countSeries(first, safeMonths, appRepo.monthlyCountsSince(start)));
        response.put("claims", countSeries(first, safeMonths, claimRepo.monthlyCountsSince(start)));
        response.put("payments", countSeries(first, safeMonths, paymentRepo.monthlyCountsSince(start)));
        return response;
    }

    /** Compact feedback payload for the local Python sentiment analyzer. */
    @GetMapping("/prediction/feedback-data")
    @Transactional(readOnly = true)
    public Map<String, Object> getFeedbackPredictionData(@RequestParam(defaultValue = "500") int limit) {
        int safeLimit = Math.max(20, Math.min(limit, 2000));
        var page = feedbackRepo.findAll(PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> feedbacks = page.getContent().stream().map(f -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", f.getId());
            row.put("rating", f.getRating());
            row.put("category", f.getCategory());
            row.put("message", f.getMessage() == null ? "" : f.getMessage().substring(0, Math.min(f.getMessage().length(), 600)));
            row.put("createdAt", f.getCreatedAt());
            return row;
        }).toList();
        return Map.of("feedbacks", feedbacks, "sampleSize", feedbacks.size(), "totalFeedback", page.getTotalElements());
    }

    /**
     * Supplies only non-identity application facts needed for readiness checks.
     * This endpoint intentionally excludes name, email, NRC, DOB and other customer identity fields.
     */
    @GetMapping("/prediction/application-readiness-data/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getApplicationReadinessData(@PathVariable Long id) {
        PolicyApplication app = appRepo.findById(id).orElse(null);
        if (app == null) return ResponseEntity.notFound().build();
        InsurancePackage pkg = app.getInsurancePackage();
        if (pkg == null) return ResponseEntity.badRequest().body(Map.of("message", "Application package is missing"));

        int uploadedDocs = FileStorageUtil.fromJsonArray(app.getDocumentsPath()).size();
        int requiredDocs = FileStorageUtil.fromJsonArray(pkg.getRequiredDocumentsJson()).size();
        int totalRequiredFields = 0;
        int completedRequiredFields = 0;
        try {
            Map<String, Object> submitted = app.getFormData() == null || app.getFormData().isBlank()
                    ? Collections.emptyMap()
                    : MAPPER.readValue(app.getFormData(), Map.class);
            var template = formTemplateRepo.findFirstByInsurancePackageIdAndFormTypeAndActiveTrue(pkg.getId(), FormType.APPLICATION).orElse(null);
            if (template != null) {
                for (FormField field : template.getFields()) {
                    if (!field.isRequired()) continue;
                    totalRequiredFields++;
                    Object value = submitted.get(String.valueOf(field.getId()));
                    if (value != null && !value.toString().isBlank() && !"[]".equals(value.toString())) completedRequiredFields++;
                }
            } else {
                totalRequiredFields = submitted.size();
                completedRequiredFields = (int) submitted.values().stream()
                        .filter(v -> v != null && !v.toString().isBlank() && !"[]".equals(v.toString())).count();
            }
        } catch (Exception ignored) {
            totalRequiredFields = 0;
            completedRequiredFields = 0;
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", app.getId());
        data.put("status", app.getStatus() != null ? app.getStatus().name() : "");
        data.put("package_name", pkg.getName());
        data.put("package_type", pkg.getType());
        data.put("coverage_amount", app.getCoverageAmount());
        data.put("coverage_min", pkg.getCoverageMin());
        data.put("coverage_max", pkg.getCoverageMax());
        data.put("duration", app.getDuration());
        data.put("min_policy_term", pkg.getMinPolicyTerm());
        data.put("policy_term", pkg.getPolicyTerm());
        data.put("required_document_count", requiredDocs);
        data.put("uploaded_document_count", uploadedDocs);
        data.put("form_field_count", totalRequiredFields);
        data.put("completed_field_count", completedRequiredFields);
        data.put("risk_level", app.getRiskLevel() != null ? app.getRiskLevel() : "UNKNOWN");
        return ResponseEntity.ok(Map.of("application", data));
    }

    private Map<YearMonth, BigDecimal> zeroMoneySeries(YearMonth first, int months) {
        Map<YearMonth, BigDecimal> totals = new LinkedHashMap<>();
        for (int i = 0; i < months; i++) totals.put(first.plusMonths(i), BigDecimal.ZERO);
        return totals;
    }

    private List<Map<String, Object>> countSeries(YearMonth first, int months, List<Object[]> rows) {
        Map<YearMonth, Long> totals = new LinkedHashMap<>();
        for (int i = 0; i < months; i++) totals.put(first.plusMonths(i), 0L);
        for (Object[] row : rows) {
            YearMonth month = YearMonth.parse(row[0].toString());
            if (totals.containsKey(month)) totals.put(month, ((Number) row[1]).longValue());
        }
        return totals.entrySet().stream().map(entry -> {
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("month", entry.getKey().toString());
            point.put("value", entry.getValue());
            return point;
        }).toList();
    }

    @GetMapping("/recent-activities")
    @Transactional(readOnly = true)
    public List<?> getRecentActivities() {
        return notifRepo.findTop10ByOrderByCreatedAtDesc().stream()
                .map(n -> Map.of("description", n.getTitle(), "createdAt", n.getCreatedAt(), "icon", "bi-activity"))
                .toList();
    }

    // ── Notifications ─────────────────────────────────────────────────

    @GetMapping("/notifications/sent")
    @Transactional(readOnly = true)
    public List<?> getSentNotifications() {
        return notifRepo.findAll().stream()
                .sorted(Comparator.comparing(Notification::getCreatedAt).reversed())
                .limit(50)
                .map(n -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",         n.getId());
                    m.put("title",      n.getTitle());
                    m.put("message",    n.getMessage());
                    m.put("type",       n.getType().name());
                    m.put("targetRole", n.getTargetRole());
                    m.put("createdAt",  n.getCreatedAt());
                    return m;
                }).toList();
    }

    @PostMapping("/notifications/send")
    @Transactional
    public ResponseEntity<?> sendNotifications(@RequestBody Map<String, Object> req) {
        String title       = req.get("title").toString();
        String message     = req.get("message").toString();
        String typeStr     = req.getOrDefault("type", "INFO").toString();
        String targetRole  = req.getOrDefault("targetRole", "ALL").toString();
        String targetUserId = req.containsKey("targetUserId") && req.get("targetUserId") != null
                ? req.get("targetUserId").toString() : null;

        NotificationType type;
        try { type = NotificationType.valueOf(typeStr); } catch (Exception e) { type = NotificationType.INFO; }

        List<User> recipients = new ArrayList<>();
        if (targetUserId != null && !targetUserId.isBlank()) {
            userRepo.findById(Long.valueOf(targetUserId)).ifPresent(recipients::add);
        } else switch (targetRole) {
            case "CUSTOMER" -> recipients.addAll(userRepo.findAllByRole(Role.CUSTOMER));
            case "AGENT"    -> recipients.addAll(userRepo.findAllByRole(Role.AGENT));
            default         -> {
                recipients.addAll(userRepo.findAllByRole(Role.CUSTOMER));
                recipients.addAll(userRepo.findAllByRole(Role.AGENT));
            }
        }

        notifService.sendToAll(recipients, title, message, type, targetRole);
        return ResponseEntity.ok(Map.of("sent", recipients.size()));
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private Map<String, Object> typeToMap(InsuranceType t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id",          t.getId());
        m.put("name",        t.getName());
        m.put("description", t.getDescription() != null ? t.getDescription() : "");
        m.put("benefits",    t.getBenefits()    != null ? t.getBenefits()    : "");
        m.put("rules",       t.getRules()       != null ? t.getRules()       : "");
        return m;
    }
}
