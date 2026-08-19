package com.insurance.portal.controller;

import com.insurance.portal.dto.*;
import com.insurance.portal.model.*;
import com.insurance.portal.model.enums.*;
import com.insurance.portal.repository.*;
import com.insurance.portal.service.NotificationService;
import com.insurance.portal.util.FileStorageUtil;
import com.insurance.portal.util.DigitalSignatureUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.*;

@RestController
@RequestMapping("/agent")
@RequiredArgsConstructor
public class AgentController {

    private final UserRepository userRepo;
    private final PolicyApplicationRepository appRepo;
    private final ClaimRepository claimRepo;
    private final NotificationService notifService;

    private User getAgent(UserDetails principal) {
        return userRepo.findByEmail(principal.getUsername()).orElseThrow();
    }

    @GetMapping("/dashboard/stats")
    @Transactional(readOnly = true)
    public Map<String, Object> getStats(@AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Map<String, Object> stats = new HashMap<>();
        stats.put("pending", appRepo.findAllByAgentAndStatus(agent, ApplicationStatus.PENDING).size());
        stats.put("verified", appRepo.findAllByAgentAndStatus(agent, ApplicationStatus.VERIFIED).size());
        stats.put("pendingClaims", claimRepo.findAllByAgentAndStatus(agent, ClaimStatus.PENDING).size());
        stats.put("verifiedClaims", claimRepo.findAllByAgentAndStatus(agent, ClaimStatus.VERIFIED).size());
        stats.put("unreadNotifications", notifService.countUnread(agent));
        return stats;
    }

    /**
     * Returns all admins + customers who have applied for the agent's insurance type.
     * If the agent's insuranceType is null or "ALL", all assigned customers are returned.
     */
    @GetMapping("/contacts")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getContacts(@AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        String agentType = agent.getInsuranceType(); // e.g. "LIFE", "HEALTH", "ALL", null

        List<User> admins = userRepo.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .toList();

        // Collect customers who applied for this agent's insurance type
        Set<Long> customerIds = new HashSet<>();
        boolean allTypes = agentType == null || agentType.isBlank() || "ALL".equalsIgnoreCase(agentType);

        appRepo.findAll().forEach(a -> {
            if (a.getCustomer() == null) return;
            String pkgType = a.getInsurancePackage() != null ? a.getInsurancePackage().getType() : null;
            if (allTypes || agentType.equalsIgnoreCase(pkgType)) {
                customerIds.add(a.getCustomer().getId());
            }
        });

        List<User> customers = userRepo.findAll().stream()
                .filter(u -> u.getRole() == Role.CUSTOMER && customerIds.contains(u.getId()))
                .toList();

        return ResponseEntity.ok(Map.of(
                "admins",    admins.stream().map(UserResponse::from).toList(),
                "customers", customers.stream().map(UserResponse::from).toList(),
                "agentType", agentType != null ? agentType : "ALL"
        ));
    }

    /** Agent sends a direct message delivered as an in-app notification */
    @PostMapping("/messages")
    @Transactional
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, String> req,
                                          @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Long recipientId = Long.parseLong(req.get("recipientId"));
        String subject = req.getOrDefault("subject", "(no subject)");
        String body = req.getOrDefault("body", "");
        User recipient = userRepo.findById(recipientId)
                .orElseThrow(() -> new RuntimeException("Recipient not found"));
        notifService.send(recipient,
                "Message from Agent " + agent.getName() + ": " + subject,
                body,
                NotificationType.INFO);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/applications")
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplications(@AuthenticationPrincipal UserDetails principal,
                                                      @RequestParam(required = false) Integer limit,
                                                      @RequestParam(required = false) String status) {
        User agent = getAgent(principal);
        return appRepo.findAllByAgent(agent).stream()
                .filter(a -> {
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        try { return a.getStatus() == ApplicationStatus.valueOf(status.toUpperCase()); }
                        catch (IllegalArgumentException e) { return false; }
                    }
                    // default: PENDING + REVISION_REQUESTED only
                    return a.getStatus() == ApplicationStatus.PENDING || a.getStatus() == ApplicationStatus.REVISION_REQUESTED;
                })
                .sorted(Comparator.comparing(PolicyApplication::getCreatedAt).reversed())
                .limit(limit != null ? limit : Long.MAX_VALUE)
                .map(ApplicationResponse::from).toList();
    }

    @PutMapping("/applications/{id}/verify")
    @Transactional
    public ResponseEntity<?> verifyApplication(@PathVariable Long id,
                                               @RequestBody Map<String, String> req,
                                               @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        // Ownership check
        if (app.getAgent() == null || !app.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this application"));
        }
        if (app.getStatus() != ApplicationStatus.PENDING && app.getStatus() != ApplicationStatus.REVISION_REQUESTED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application is not in a verifiable state"));
        }
        String signatureError = DigitalSignatureUtil.validationError(req.get("signature"));
        if (signatureError != null)
            return ResponseEntity.badRequest().body(Map.of("message", signatureError));
        app.setStatus(ApplicationStatus.VERIFIED);
        app.setAgentNote(req.get("note"));
        app.setAgentSignature(req.get("signature"));
        app.setAgentSignedAt(java.time.LocalDateTime.now());
        return ResponseEntity.ok(ApplicationResponse.from(appRepo.save(app)));
    }

    @PutMapping("/applications/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectApplication(@PathVariable Long id,
                                               @RequestBody Map<String, String> req,
                                               @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        // Ownership check
        if (app.getAgent() == null || !app.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this application"));
        }
        if (app.getStatus() != ApplicationStatus.PENDING && app.getStatus() != ApplicationStatus.REVISION_REQUESTED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Application cannot be rejected at this stage"));
        }
        app.setStatus(ApplicationStatus.REJECTED);
        app.setAgentNote(req.get("note"));
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "Application Rejected",
                "Your application for " + app.getInsurancePackage().getName()
                        + " was rejected. Reason: " + req.getOrDefault("note", "N/A"),
                NotificationType.REJECTION);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    @PutMapping("/applications/{id}/request-revision")
    @Transactional
    public ResponseEntity<?> requestApplicationRevision(@PathVariable Long id,
                                                        @RequestBody Map<String, String> req,
                                                        @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (app.getAgent() == null || !app.getAgent().getId().equals(agent.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this application"));
        if (app.getStatus() != ApplicationStatus.REVISION_REQUESTED)
            return ResponseEntity.badRequest().body(Map.of("message", "Application is not in revision state"));
        String note = req.get("note");
        app.setAgentNote(note);
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "Action Required: Update Your Application",
                "Your application for " + app.getInsurancePackage().getName()
                        + " needs to be updated. "
                        + (note != null && !note.isBlank() ? "Agent note: " + note : "Please review and resubmit your form."),
                NotificationType.INFO);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    @PutMapping("/claims/{id}/request-revision")
    @Transactional
    public ResponseEntity<?> requestClaimRevision(@PathVariable Long id,
                                                   @RequestBody Map<String, String> req,
                                                   @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getAgent() == null || !claim.getAgent().getId().equals(agent.getId()))
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this claim"));
        if (claim.getStatus() != ClaimStatus.REVISION_REQUESTED)
            return ResponseEntity.badRequest().body(Map.of("message", "Claim is not in revision state"));
        String note = req.get("note");
        claim.setAgentNote(note);
        claimRepo.save(claim);
        notifService.send(claim.getCustomer(),
                "Action Required: Update Your Claim",
                "Your claim requires additional information. "
                        + (note != null && !note.isBlank() ? "Agent note: " + note : "Please review and resubmit your form."),
                NotificationType.INFO);
        return ResponseEntity.ok(ClaimResponse.from(claim));
    }

    @GetMapping("/claims")
    @Transactional(readOnly = true)
    public List<ClaimResponse> getClaims(@AuthenticationPrincipal UserDetails principal,
                                         @RequestParam(required = false) String status) {
        User agent = getAgent(principal);
        return claimRepo.findAllByAgent(agent).stream()
                .filter(c -> {
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        try { return c.getStatus() == ClaimStatus.valueOf(status.toUpperCase()); }
                        catch (IllegalArgumentException e) { return false; }
                    }
                    return c.getStatus() == ClaimStatus.PENDING || c.getStatus() == ClaimStatus.REVISION_REQUESTED;
                })
                .sorted(Comparator.comparing(Claim::getCreatedAt).reversed())
                .map(ClaimResponse::from).toList();
    }

    @PutMapping("/claims/{id}/verify")
    @Transactional
    public ResponseEntity<?> verifyClaim(@PathVariable Long id,
                                         @RequestBody Map<String, String> req,
                                         @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        // Ownership check
        if (claim.getAgent() == null || !claim.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this claim"));
        }
        if (claim.getStatus() != ClaimStatus.PENDING && claim.getStatus() != ClaimStatus.REVISION_REQUESTED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Claim is not in a verifiable state"));
        }
        String signatureError = DigitalSignatureUtil.validationError(req.get("signature"));
        if (signatureError != null)
            return ResponseEntity.badRequest().body(Map.of("message", signatureError));
        claim.setStatus(ClaimStatus.VERIFIED);
        claim.setAgentNote(req.get("note"));
        claim.setAgentSignature(req.get("signature"));
        claim.setAgentSignedAt(java.time.LocalDateTime.now());
        return ResponseEntity.ok(ClaimResponse.from(claimRepo.save(claim)));
    }

    @PutMapping("/claims/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectClaim(@PathVariable Long id,
                                         @RequestBody Map<String, String> req,
                                         @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        // Ownership check
        if (claim.getAgent() == null || !claim.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this claim"));
        }
        if (claim.getStatus() != ClaimStatus.PENDING && claim.getStatus() != ClaimStatus.REVISION_REQUESTED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Claim cannot be rejected at this stage"));
        }
        claim.setStatus(ClaimStatus.REJECTED);
        claim.setAgentNote(req.get("note"));
        claimRepo.save(claim);
        notifService.send(claim.getCustomer(),
                "Claim Rejected",
                "Your claim of " + claim.getAmount() + " MMK was rejected. Reason: "
                        + req.getOrDefault("note", "N/A"),
                NotificationType.REJECTION);
        return ResponseEntity.ok(ClaimResponse.from(claim));
    }

    // ── Document viewing (application supporting docs & claim evidence) ─
    @GetMapping("/applications/{id}/documents/{index}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getApplicationDocument(@PathVariable Long id, @PathVariable int index,
                                                    @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (app.getAgent() == null || !app.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this application"));
        }
        List<String> docs = FileStorageUtil.fromJsonArray(app.getDocumentsPath());
        if (index < 0 || index >= docs.size()) return ResponseEntity.notFound().build();
        return FileStorageUtil.streamFile(docs.get(index));
    }

    @GetMapping("/claims/{id}/documents/{index}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getClaimDocument(@PathVariable Long id, @PathVariable int index,
                                              @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getAgent() == null || !claim.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not assigned to this claim"));
        }
        List<String> docs = FileStorageUtil.fromJsonArray(claim.getDocumentsPath());
        if (index < 0 || index >= docs.size()) return ResponseEntity.notFound().build();
        return FileStorageUtil.streamFile(docs.get(index));
    }

    /** Serve a file uploaded into a dynamic form field for an application */
    @GetMapping("/applications/{id}/form-file/{fieldId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getApplicationFormFile(@PathVariable Long id, @PathVariable String fieldId,
            @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        PolicyApplication app = appRepo.findById(id).orElseThrow();
        if (app.getAgent() == null || !app.getAgent().getId().equals(agent.getId()))
            return ResponseEntity.status(403).build();
        return FileStorageUtil.serveFormFile(app.getFormData(), fieldId);
    }

    /** Serve a file uploaded into a dynamic form field for a claim */
    @GetMapping("/claims/{id}/form-file/{fieldId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getClaimFormFile(@PathVariable Long id, @PathVariable String fieldId,
            @AuthenticationPrincipal UserDetails principal) {
        User agent = getAgent(principal);
        Claim claim = claimRepo.findById(id).orElseThrow();
        if (claim.getAgent() == null || !claim.getAgent().getId().equals(agent.getId()))
            return ResponseEntity.status(403).build();
        return FileStorageUtil.serveFormFile(claim.getFormData(), fieldId);
    }

    // Notification listing is handled by the shared NotificationController GET /notifications
}
