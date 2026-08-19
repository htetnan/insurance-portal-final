package com.insurance.portal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurance.portal.dto.*;
import com.insurance.portal.model.*;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import com.insurance.portal.service.PolicyService;
import com.insurance.portal.util.FileStorageUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final UserRepository userRepo;
    private final InsurancePackageRepository packageRepo;
    private final PolicyApplicationRepository appRepo;
    private final ClaimRepository claimRepo;
    private final PaymentRepository paymentRepo;
    private final NotificationRepository notifRepo;
    private final PaymentMethodConfigRepository paymentMethodConfigRepo;
    private final PolicyService policyService;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private User getUser(UserDetails principal) {
        return userRepo.findByEmail(principal.getUsername()).orElseThrow();
    }

    // ── Dashboard Stats ──────────────────────────────────────────────
    @GetMapping("/dashboard/stats")
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats(@AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Map<String, Object> stats = new HashMap<>();
        stats.put("applications", appRepo.countByCustomer(user));
        stats.put("activePolicies", appRepo.countByCustomerAndStatus(user, ApplicationStatus.APPROVED));
        stats.put("pendingClaims", claimRepo.countByCustomerAndStatus(user, ClaimStatus.PENDING));
        stats.put("notifications", notifRepo.countByRecipientAndReadFalse(user));
        return stats;
    }

    // ── Applications ─────────────────────────────────────────────────
    @GetMapping("/applications")
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplications(@AuthenticationPrincipal UserDetails principal,
                                                      @RequestParam(required = false) String status) {
        User user = getUser(principal);
        List<PolicyApplication> apps;
        if (status != null && !status.isEmpty()) {
            try { apps = appRepo.findAllByCustomerAndStatus(user, ApplicationStatus.valueOf(status)); }
            catch (Exception e) { apps = appRepo.findAllByCustomer(user); }
        } else {
            apps = appRepo.findAllByCustomer(user);
        }
        return apps.stream().sorted(Comparator.comparing(PolicyApplication::getCreatedAt).reversed())
                .map(ApplicationResponse::from).toList();
    }

    /**
     * Submit an insurance application.
     * Accepts multipart/form-data with:
     *   - packageId, coverageAmount, duration (required)
     *   - formData: JSON string {fieldId: value, ...} from the dynamic form
     *   - File fields named "file_<fieldId>" for IMAGE_UPLOAD / PDF_UPLOAD fields
     *   - notes, commonInfo, extraInfo (legacy / optional)
     */
    @PostMapping(value = "/applications", consumes = {"multipart/form-data"})
    @Transactional
    public ResponseEntity<?> submitApplication(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam String packageId,
            @RequestParam String coverageAmount,
            @RequestParam String duration,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false) String commonInfo,
            @RequestParam(required = false) String extraInfo,
            @RequestParam(required = false) String formData,
            @RequestParam(required = false) List<MultipartFile> documents,
            HttpServletRequest request) {

        User user = getUser(principal);
        Long pkgId = Long.valueOf(packageId);
        InsurancePackage pkg = packageRepo.findById(pkgId)
                .orElseThrow(() -> new RuntimeException("Package not found"));
        if (!pkg.isActive())
            return ResponseEntity.badRequest().body(Map.of("message", "This package is no longer available"));

        BigDecimal coverage = new BigDecimal(coverageAmount);
        int dur = Integer.parseInt(duration);

        String riskLevel = policyService.calculateRisk(pkg.getType(), commonInfo, extraInfo);
        BigDecimal premiumAmount = policyService.calculatePremium(coverage, pkg.getPremiumRate(), dur, riskLevel);
        String policyNumber = policyService.generatePolicyNumber(pkg.getType());

        List<User> agents = userRepo.findAllByRoleAndActive(Role.AGENT, true);
        User agent = agents.stream()
                .filter(a -> a.getInsuranceType() == null
                        || "ALL".equals(a.getInsuranceType())
                        || a.getInsuranceType().equals(pkg.getType()))
                .findFirst().orElse(agents.isEmpty() ? null : agents.get(0));

        // Process dynamic form file uploads: fields named "file_<fieldId>"
        String processedFormData = formData;
        if (formData != null && request instanceof MultipartHttpServletRequest mpr) {
            Map<String, MultipartFile> fileMap = mpr.getFileMap();
            if (!fileMap.isEmpty()) {
                processedFormData = processFormFileUploads(formData, fileMap, "applications", "app_field");
            }
        }

        String documentsJson;
        try {
            documentsJson = FileStorageUtil.toJsonArray(FileStorageUtil.saveDocuments(documents, "applications", "app"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to save uploaded documents"));
        }

        PolicyApplication app = PolicyApplication.builder()
                .customer(user)
                .insurancePackage(pkg)
                .agent(agent)
                .coverageAmount(coverage)
                .duration(dur)
                .notes(notes)
                .commonInfo(commonInfo)
                .extraInfo(extraInfo)
                .formData(processedFormData)
                .riskLevel(riskLevel)
                .premiumAmount(premiumAmount)
                .policyNumber(policyNumber)
                .documentsPath(documentsJson)
                .status(ApplicationStatus.PENDING)
                .build();
        return ResponseEntity.ok(ApplicationResponse.from(appRepo.save(app)));
    }

    @DeleteMapping("/applications/{id}")
    @Transactional
    public ResponseEntity<?> cancelApplication(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        if (app.getStatus() != ApplicationStatus.PENDING)
            return ResponseEntity.badRequest().body(Map.of("message", "Only PENDING applications can be cancelled"));
        app.setStatus(ApplicationStatus.CANCELLED);
        appRepo.save(app);
        return ResponseEntity.ok(Map.of("message", "Application cancelled"));
    }

    /**
     * Customer revises a REVISION_REQUESTED application.
     * Merges new form values over existing ones; new file uploads replace old ones.
     * Resets status back to PENDING for agent re-verification.
     */
    @PutMapping(value = "/applications/{id}/revise", consumes = {"multipart/form-data"})
    @Transactional
    public ResponseEntity<?> reviseApplication(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails principal,
                                               @RequestParam(required = false) String formData,
                                               HttpServletRequest request) {
        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        if (app.getStatus() != ApplicationStatus.REVISION_REQUESTED
                && app.getStatus() != ApplicationStatus.PENDING
                && app.getStatus() != ApplicationStatus.REJECTED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only PENDING, REVISION_REQUESTED, or REJECTED applications can be edited"));

        if (formData != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> existingData = app.getFormData() != null
                        ? MAPPER.readValue(app.getFormData(), Map.class) : new HashMap<>();
                @SuppressWarnings("unchecked")
                Map<String, Object> newData = MAPPER.readValue(formData, Map.class);
                existingData.putAll(newData);
                String merged = MAPPER.writeValueAsString(existingData);
                if (request instanceof MultipartHttpServletRequest mpr) {
                    Map<String, MultipartFile> fileMap = mpr.getFileMap();
                    if (!fileMap.isEmpty()) {
                        merged = processFormFileUploads(merged, fileMap, "applications", "app_field");
                    }
                }
                app.setFormData(merged);
            } catch (Exception e) {
                app.setFormData(formData);
            }
        }
        app.setStatus(ApplicationStatus.PENDING);
        app.setAgentSignature(null);
        app.setAgentSignedAt(null);
        app.setAdminSignature(null);
        app.setAdminSignedAt(null);
        app.setApprovedBy(null);
        app.setApprovedAt(null);
        return ResponseEntity.ok(ApplicationResponse.from(appRepo.save(app)));
    }

    /**
     * Permanently delete a CANCELLED application from the database.
     */
    @DeleteMapping("/applications/{id}/permanent")
    @Transactional
    public ResponseEntity<?> deleteApplication(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        if (app.getStatus() != ApplicationStatus.CANCELLED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only CANCELLED applications can be deleted"));
        appRepo.delete(app);
        return ResponseEntity.ok(Map.of("message", "Application deleted"));
    }

    /**
     * Customer revises a REVISION_REQUESTED claim.
     * Merges new form values over existing ones; resets status to PENDING.
     */
    @PutMapping(value = "/claims/{id}/revise", consumes = {"multipart/form-data"})
    @Transactional
    public ResponseEntity<?> reviseClaim(@PathVariable Long id,
                                         @AuthenticationPrincipal UserDetails principal,
                                         @RequestParam(required = false) String formData,
                                         HttpServletRequest request) {
        User user = getUser(principal);
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        if (!claim.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        if (claim.getStatus() != ClaimStatus.REVISION_REQUESTED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only REVISION_REQUESTED claims can be revised"));

        if (formData != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> existingData = claim.getFormData() != null
                        ? MAPPER.readValue(claim.getFormData(), Map.class) : new HashMap<>();
                @SuppressWarnings("unchecked")
                Map<String, Object> newData = MAPPER.readValue(formData, Map.class);
                existingData.putAll(newData);
                String merged = MAPPER.writeValueAsString(existingData);
                if (request instanceof MultipartHttpServletRequest mpr) {
                    Map<String, MultipartFile> fileMap = mpr.getFileMap();
                    if (!fileMap.isEmpty()) {
                        merged = processFormFileUploads(merged, fileMap, "claims", "claim_field");
                    }
                }
                claim.setFormData(merged);
            } catch (Exception e) {
                claim.setFormData(formData);
            }
        }
        claim.setStatus(ClaimStatus.PENDING);
        claim.setAgentSignature(null);
        claim.setAgentSignedAt(null);
        claim.setAdminSignature(null);
        claim.setAdminSignedAt(null);
        return ResponseEntity.ok(ClaimResponse.from(claimRepo.save(claim)));
    }

    // ── Claims ───────────────────────────────────────────────────────
    @GetMapping("/claims")
    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaims(@AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return claimRepo.findAllByCustomer(user).stream()
                .sorted(Comparator.comparing(Claim::getCreatedAt).reversed())
                .map(ClaimResponse::from).toList();
    }

    /**
     * Submit an insurance claim.
     * Accepts multipart/form-data with:
     *   - applicationId, claimType, amount, description, incidentDate (required)
     *   - formData: JSON string {fieldId: value, ...} from the dynamic claim form
     *   - File fields named "file_<fieldId>" for upload fields
     */
    @PostMapping(value = "/claims", consumes = {"multipart/form-data"})
    @Transactional
    public ResponseEntity<?> submitClaim(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam String applicationId,
            @RequestParam String claimType,
            @RequestParam String amount,
            @RequestParam String description,
            @RequestParam String incidentDate,
            @RequestParam(required = false) String formData,
            @RequestParam(required = false) List<MultipartFile> documents,
            HttpServletRequest request) {

        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(Long.valueOf(applicationId))
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "This application does not belong to you"));
        if (app.getStatus() != ApplicationStatus.APPROVED)
            return ResponseEntity.badRequest().body(Map.of("message", "Claims can only be submitted for APPROVED policies"));
        if (claimRepo.existsByApplication_Id(app.getId()))
            return ResponseEntity.badRequest().body(Map.of("message", "A claim has already been submitted for this policy. Only one claim is allowed per policy."));
        if (!paymentRepo.existsByApplication_IdAndStatus(app.getId(), PaymentStatus.VERIFIED))
            return ResponseEntity.badRequest().body(Map.of("message", "You must have at least one verified payment before submitting a claim for this policy"));

        // Validate that claim amount does not exceed the policy coverage amount
        BigDecimal claimAmt;
        try { claimAmt = new BigDecimal(amount); } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid claim amount"));
        }
        if (claimAmt.compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body(Map.of("message", "Claim amount must be greater than zero"));
        if (app.getCoverageAmount() != null && claimAmt.compareTo(app.getCoverageAmount()) > 0)
            return ResponseEntity.badRequest().body(Map.of("message",
                "Claim amount cannot exceed your policy coverage of " + app.getCoverageAmount().toPlainString() + " MMK"));

        // Process dynamic form file uploads
        String processedFormData = formData;
        if (formData != null && request instanceof MultipartHttpServletRequest mpr) {
            Map<String, MultipartFile> fileMap = mpr.getFileMap();
            if (!fileMap.isEmpty()) {
                processedFormData = processFormFileUploads(formData, fileMap, "claims", "claim_field");
            }
        }

        String documentsJson;
        try {
            documentsJson = FileStorageUtil.toJsonArray(FileStorageUtil.saveDocuments(documents, "claims", "claim"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to save uploaded documents"));
        }

        Claim claim = Claim.builder()
                .application(app)
                .customer(user)
                .agent(app.getAgent())
                .claimType(claimType)
                .amount(new BigDecimal(amount))
                .description(description)
                .incidentDate(LocalDate.parse(incidentDate))
                .documentsPath(documentsJson)
                .formData(processedFormData)
                .status(ClaimStatus.PENDING)
                .build();
        return ResponseEntity.ok(ClaimResponse.from(claimRepo.save(claim)));
    }

    // ── Payments ─────────────────────────────────────────────────────
    @GetMapping("/payments")
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(@AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return paymentRepo.findAllByCustomer(user).stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .map(PaymentResponse::from).toList();
    }

    /** Returns the full installment schedule for all APPROVED policies of this customer. */
    @GetMapping("/payment-schedule")
    @Transactional(readOnly = true)
    public List<com.insurance.portal.dto.PremiumScheduleResponse> getPaymentSchedule(
            @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return appRepo.findAllByCustomerAndStatus(user, ApplicationStatus.APPROVED).stream()
                .map(app -> {
                    List<Payment> payments = paymentRepo.findAllByApplication_Id(app.getId());
                    return com.insurance.portal.util.PremiumScheduleUtil.buildSchedule(app, payments);
                })
                .toList();
    }

    @PostMapping("/payments")
    @Transactional
    public ResponseEntity<?> submitPayment(@AuthenticationPrincipal UserDetails principal,
                                           @RequestParam String applicationId,
                                           @RequestParam(required = false) String paymentMethod,
                                           @RequestParam(required = false) MultipartFile screenshot,
                                           @RequestParam(required = false) String notes,
                                           @RequestParam(required = false) String signature,
                                           @RequestParam(required = false) Integer periodNumber,
                                           @RequestParam(required = false) String periodLabel,
                                           @RequestParam(required = false) String transactionLastSixDigits,
                                           @RequestParam(required = false) java.math.BigDecimal transactionAmount) {
        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(Long.valueOf(applicationId))
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (!app.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "This application does not belong to you"));
        if (app.getStatus() != ApplicationStatus.APPROVED)
            return ResponseEntity.badRequest().body(Map.of("message", "Payment can only be submitted for APPROVED applications"));

        // For period-based payments: block duplicate submission for same period
        if (periodNumber != null) {
            if (paymentRepo.existsByApplication_IdAndPeriodNumberAndStatusNot(
                    app.getId(), periodNumber, PaymentStatus.REJECTED)) {
                return ResponseEntity.badRequest().body(Map.of("message",
                        "A payment for period " + periodNumber + " already exists"));
            }
        } else {
            // Legacy / one-time: block if any pending payment exists
            if (paymentRepo.existsByApplication_IdAndStatus(app.getId(), PaymentStatus.PENDING))
                return ResponseEntity.badRequest().body(Map.of("message", "A pending payment already exists for this application"));
        }

        // Validate payment method against DB (fall back to built-in list if no DB entries yet)
        boolean methodValid;
        long dbCount = paymentMethodConfigRepo.count();
        if (dbCount > 0) {
            methodValid = paymentMethod != null &&
                    paymentMethodConfigRepo.findByMethodKey(paymentMethod)
                            .map(com.insurance.portal.model.PaymentMethodConfig::isActive)
                            .orElse(false);
        } else {
            methodValid = paymentMethod != null &&
                    Set.of("KBZ_PAY", "WAVE_PAY", "AYA_PAY").contains(paymentMethod);
        }
        if (!methodValid)
            return ResponseEntity.badRequest().body(Map.of("message", "Please select a valid payment method"));
        if (screenshot == null || screenshot.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "A payment proof screenshot is required"));

        // Validate transaction last 6 digits
        if (transactionLastSixDigits == null || transactionLastSixDigits.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Transaction number (last 6 digits) is required"));
        String last6 = transactionLastSixDigits.trim().replaceAll("[^0-9]", "");
        if (last6.length() != 6)
            return ResponseEntity.badRequest().body(Map.of("message", "Transaction number must be exactly 6 digits"));
        if (transactionAmount == null || transactionAmount.compareTo(java.math.BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body(Map.of("message", "Transfer amount is required and must be greater than 0"));

        // Duplicate transaction check — same last-6 digits already used in any non-rejected payment
        if (paymentRepo.existsByTransactionLastSixDigitsAndStatusNot(last6, PaymentStatus.REJECTED))
            return ResponseEntity.status(409).body(Map.of("message",
                "ဤ Transaction (" + last6 + ") သည် တင်ပြပြီးသားဖြစ်သည်။ Duplicate ဖြစ်နေသောကြောင့် ထပ်မံတင်ပြ၍မရပါ"));

        String screenshotPath;
        try {
            screenshotPath = FileStorageUtil.saveDocument(screenshot, "payments", "payment");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to save screenshot"));
        }

        // Determine installment amount for this period
        BigDecimal payAmount = app.getPremiumAmount();
        if (periodNumber != null && app.getInsurancePackage() != null) {
            Integer intervalMonths = app.getInsurancePackage().getPaymentIntervalMonths();
            if (intervalMonths != null && intervalMonths > 0 && app.getDuration() != null) {
                int totalInstallments = (app.getDuration() * 12) / intervalMonths;
                if (totalInstallments > 1) {
                    payAmount = app.getPremiumAmount()
                            .divide(java.math.BigDecimal.valueOf(totalInstallments), 2, java.math.RoundingMode.HALF_UP);
                }
            }
        }

        Payment payment = Payment.builder()
                .application(app).customer(user)
                .amount(payAmount)
                .paymentType("PREMIUM").paymentMethod(paymentMethod)
                .screenshotPath(screenshotPath).notes(notes)
                .periodNumber(periodNumber).periodLabel(periodLabel)
                .transactionLastSixDigits(last6)
                .transactionAmount(transactionAmount)
                .status(PaymentStatus.PENDING).build();
        return ResponseEntity.ok(PaymentResponse.from(paymentRepo.save(payment)));
    }

    // ── Active Policies ─────────────────────────────────────────────
    @GetMapping("/policies")
    @Transactional(readOnly = true)
    public List<?> getActivePolicies(@AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return appRepo.findAllByCustomerAndStatus(user, ApplicationStatus.APPROVED).stream()
                .sorted(Comparator.comparing(PolicyApplication::getCreatedAt).reversed())
                .map(app -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", app.getId());
                    m.put("policyNumber", app.getPolicyNumber());
                    m.put("packageName", app.getInsurancePackage() != null ? app.getInsurancePackage().getName() : null);
                    m.put("packageType", app.getInsurancePackage() != null ? app.getInsurancePackage().getType() : null);
                    m.put("coverageAmount", app.getCoverageAmount());
                    m.put("premiumAmount", app.getPremiumAmount());
                    m.put("duration", app.getDuration());
                    m.put("riskLevel", app.getRiskLevel());
                    m.put("status", app.getStatus().name());
                    m.put("createdAt", app.getCreatedAt());
                    m.put("agentName", app.getAgent() != null ? app.getAgent().getName() : null);
                    return m;
                }).toList();
    }

    @PostMapping("/applications/{id}/renew")
    @Transactional
    public ResponseEntity<?> renewPolicy(@PathVariable Long id,
                                         @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        PolicyApplication original = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Policy not found"));
        if (!original.getCustomer().getId().equals(user.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        if (original.getStatus() != ApplicationStatus.APPROVED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only active policies can be renewed"));
        String newPolicyNumber = original.getInsurancePackage() != null
                ? policyService.generatePolicyNumber(original.getInsurancePackage().getType())
                : policyService.generatePolicyNumber("POL");
        PolicyApplication renewal = PolicyApplication.builder()
                .customer(user)
                .insurancePackage(original.getInsurancePackage())
                .agent(original.getAgent())
                .coverageAmount(original.getCoverageAmount())
                .duration(original.getDuration())
                .notes("Renewal of policy " + original.getPolicyNumber())
                .commonInfo(original.getCommonInfo())
                .extraInfo(original.getExtraInfo())
                .formData(original.getFormData())
                .riskLevel(original.getRiskLevel())
                .premiumAmount(original.getPremiumAmount())
                .policyNumber(newPolicyNumber)
                .status(ApplicationStatus.PENDING)
                .build();
        return ResponseEntity.ok(ApplicationResponse.from(appRepo.save(renewal)));
    }

    // ── Agent profile (customer-facing) ──────────────────────────────

    /** Returns the active agent assigned to a given insurance type (for customer view). */
    @GetMapping("/agent/by-type")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAgentByType(@RequestParam String packageType) {
        java.util.Optional<User> agent = userRepo.findFirstByRoleAndInsuranceTypeAndActive(Role.AGENT, packageType, true);
        if (agent.isEmpty()) {
            agent = userRepo.findFirstByRoleAndInsuranceTypeAndActive(Role.AGENT, "ALL", true);
        }
        return agent.<ResponseEntity<?>>map(a -> ResponseEntity.ok(Map.of(
            "id", a.getId(),
            "name", a.getName(),
            "phone", a.getPhone() != null ? a.getPhone() : "",
            "insuranceType", a.getInsuranceType() != null ? a.getInsuranceType() : "",
            "hasProfilePicture", a.getProfilePicture() != null && !a.getProfilePicture().isBlank()
        ))).orElse(ResponseEntity.notFound().build());
    }

    /** Streams an agent's profile picture (accessible by authenticated customers). */
    @GetMapping("/agent/{id}/picture")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAgentPicture(@PathVariable Long id) throws java.io.IOException {
        User agent = userRepo.findById(id).orElseThrow(() -> new RuntimeException("Agent not found"));
        if (agent.getRole() != Role.AGENT) return ResponseEntity.status(403).build();
        String path = agent.getProfilePicture();
        if (path == null || path.isBlank()) return ResponseEntity.notFound().build();
        return FileStorageUtil.streamFile(path);
    }

    // ── Form field file serving ──────────────────────────────────────
    @GetMapping("/applications/{id}/form-file/{fieldId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getApplicationFormFile(@PathVariable Long id, @PathVariable String fieldId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        PolicyApplication app = appRepo.findById(id).orElseThrow();
        if (!app.getCustomer().getId().equals(user.getId())) return ResponseEntity.status(403).build();
        return FileStorageUtil.serveFormFile(app.getFormData(), fieldId);
    }

    @GetMapping("/claims/{id}/form-file/{fieldId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getClaimFormFile(@PathVariable Long id, @PathVariable String fieldId,
            @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Claim claim = claimRepo.findById(id).orElseThrow();
        if (!claim.getCustomer().getId().equals(user.getId())) return ResponseEntity.status(403).build();
        return FileStorageUtil.serveFormFile(claim.getFormData(), fieldId);
    }

    // ── Notifications ─────────────────────────────────────────────────
    // Listing is handled by the shared NotificationController GET /notifications

    // ── Helper methods ───────────────────────────────────────────────

    /**
     * Replaces placeholder values in formData JSON for file upload fields.
     * Fields named "file_<fieldId>" in allFiles are saved and their paths
     * replace the corresponding fieldId entry in formData.
     */
    private String processFormFileUploads(String formData, Map<String, MultipartFile> allFiles,
                                          String subDir, String prefix) {
        try {
            ObjectMapper mapper = MAPPER;
            @SuppressWarnings("unchecked")
            Map<String, Object> dataMap = mapper.readValue(formData, Map.class);
            for (Map.Entry<String, MultipartFile> entry : allFiles.entrySet()) {
                String key = entry.getKey();
                if (key.startsWith("file_") && entry.getValue() != null && !entry.getValue().isEmpty()) {
                    String fieldId = key.substring(5); // strip "file_"
                    try {
                        String path = FileStorageUtil.saveDocument(entry.getValue(), subDir, prefix);
                        if (path != null) dataMap.put(fieldId, path);
                    } catch (Exception ignored) {}
                }
            }
            return mapper.writeValueAsString(dataMap);
        } catch (Exception e) {
            return formData; // return original if parsing fails
        }
    }

}
