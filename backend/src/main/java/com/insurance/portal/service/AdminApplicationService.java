package com.insurance.portal.service;

import com.insurance.portal.dto.ApplicationResponse;
import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.ApplicationStatus;
import com.insurance.portal.model.enums.NotificationType;
import com.insurance.portal.repository.PolicyApplicationRepository;
import com.insurance.portal.repository.UserRepository;
import com.insurance.portal.util.DigitalSignatureUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminApplicationService {

    private final PolicyApplicationRepository appRepo;
    private final NotificationService notifService;
    private final UserRepository userRepo;

    @Transactional
    public ResponseEntity<?> approve(Long id, String note, String signature, String adminEmail) {
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (app.getStatus() != ApplicationStatus.VERIFIED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only VERIFIED applications can be approved"));
        String signatureError = DigitalSignatureUtil.validationError(signature);
        if (signatureError != null)
            return ResponseEntity.badRequest().body(Map.of("message", signatureError));
        app.setStatus(ApplicationStatus.APPROVED);
        app.setAdminNote(note);
        app.setAdminSignature(signature);
        app.setAdminSignedAt(LocalDateTime.now());
        app.setApprovedAt(LocalDateTime.now());
        if (adminEmail != null) {
            userRepo.findByEmail(adminEmail).ifPresent(app::setApprovedBy);
        }
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "Application Approved! 🎉",
                "Your application for " + app.getInsurancePackage().getName()
                        + " has been approved. Please proceed with payment to activate your policy.",
                NotificationType.APPROVAL);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    @Transactional
    public ResponseEntity<?> reject(Long id, String note) {
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        app.setStatus(ApplicationStatus.REJECTED);
        app.setAdminNote(note);
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "Application Rejected",
                "Your application for " + app.getInsurancePackage().getName()
                        + " was rejected. Reason: " + (note != null ? note : "N/A"),
                NotificationType.REJECTION);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    @Transactional
    public ResponseEntity<?> revise(Long id, String note) {
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        app.setStatus(ApplicationStatus.REVISION_REQUESTED);
        app.setAdminNote(note);
        app.setAdminSignature(null);
        app.setAdminSignedAt(null);
        app.setRevisionDeadline(LocalDateTime.now().plusDays(7));
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "Revision Required for Your Application",
                "Your application requires changes: " + (note != null ? note : "N/A")
                        + ". Please update within 7 days.",
                NotificationType.INFO);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    /**
     * Send an overdue payment warning notification to the customer.
     * Does NOT change the application status — admin can send this multiple times.
     */
    @Transactional
    public ResponseEntity<?> warnOverdue(Long id) {
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (app.getStatus() != ApplicationStatus.APPROVED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only APPROVED (active) applications can receive an overdue warning"));
        String packageName = app.getInsurancePackage() != null ? app.getInsurancePackage().getName() : "your policy";
        notifService.send(app.getCustomer(),
                "⚠️ Premium Payment Overdue Notice",
                "Your premium payment for \"" + packageName + "\" is overdue. "
                        + "Please submit your payment as soon as possible to keep your policy active. "
                        + "Failure to pay may result in policy cancellation.",
                NotificationType.REMINDER);
        return ResponseEntity.ok(Map.of("message", "Overdue warning notification sent to customer"));
    }

    /**
     * Cancel (reject) an approved application due to non-payment of overdue premium.
     */
    @Transactional
    public ResponseEntity<?> cancelOverdue(Long id, String note) {
        PolicyApplication app = appRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        if (app.getStatus() != ApplicationStatus.APPROVED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only APPROVED (active) applications can be cancelled for non-payment"));
        String packageName = app.getInsurancePackage() != null ? app.getInsurancePackage().getName() : "your policy";
        String reason = (note != null && !note.isBlank()) ? note : "Premium payment overdue — policy cancelled due to non-payment";
        app.setStatus(ApplicationStatus.REJECTED);
        app.setAdminNote(reason);
        appRepo.save(app);
        notifService.send(app.getCustomer(),
                "❌ Policy Cancelled — Overdue Payment",
                "Your policy \"" + packageName + "\" has been cancelled due to non-payment of overdue premium. "
                        + "Reason: " + reason,
                NotificationType.REJECTION);
        return ResponseEntity.ok(ApplicationResponse.from(app));
    }
}
