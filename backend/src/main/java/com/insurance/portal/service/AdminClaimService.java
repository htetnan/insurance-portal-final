package com.insurance.portal.service;

import com.insurance.portal.dto.ClaimResponse;
import com.insurance.portal.model.Claim;
import com.insurance.portal.model.Payment;
import com.insurance.portal.model.enums.ClaimStatus;
import com.insurance.portal.model.enums.NotificationType;
import com.insurance.portal.model.enums.PaymentStatus;
import com.insurance.portal.repository.ClaimRepository;
import com.insurance.portal.repository.PaymentRepository;
import com.insurance.portal.util.DigitalSignatureUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminClaimService {

    private final ClaimRepository claimRepo;
    private final PaymentRepository paymentRepo;
    private final NotificationService notifService;

    @Transactional
    public ResponseEntity<?> approve(Long id, String note, String signature) {
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        if (claim.getStatus() != ClaimStatus.VERIFIED)
            return ResponseEntity.badRequest().body(Map.of("message", "Only VERIFIED claims can be approved"));
        String signatureError = DigitalSignatureUtil.validationError(signature);
        if (signatureError != null)
            return ResponseEntity.badRequest().body(Map.of("message", signatureError));
        claim.setStatus(ClaimStatus.APPROVED);
        claim.setAdminNote(note);
        claim.setAdminSignature(signature);
        claim.setAdminSignedAt(LocalDateTime.now());
        claimRepo.save(claim);

        paymentRepo.save(Payment.builder()
                .application(claim.getApplication())
                .customer(claim.getCustomer())
                .amount(claim.getAmount())
                .paymentType("CLAIM_PAYOUT")
                .status(PaymentStatus.VERIFIED)
                .notes("Claim #" + claim.getId() + " approved payout"
                        + (note != null && !note.isBlank() ? ": " + note : ""))
                .build());

        notifService.send(claim.getCustomer(),
                "Claim Approved ✅",
                "Your claim of " + claim.getAmount() + " MMK has been approved. Compensation will be disbursed shortly.",
                NotificationType.APPROVAL);
        return ResponseEntity.ok(ClaimResponse.from(claim));
    }

    @Transactional
    public ResponseEntity<?> reject(Long id, String note) {
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        claim.setStatus(ClaimStatus.REJECTED);
        claim.setAdminNote(note);
        claimRepo.save(claim);
        notifService.send(claim.getCustomer(),
                "Claim Rejected",
                "Your claim was rejected. Reason: " + (note != null ? note : "N/A"),
                NotificationType.REJECTION);
        return ResponseEntity.ok(ClaimResponse.from(claim));
    }

    @Transactional
    public ResponseEntity<?> revise(Long id, String note) {
        Claim claim = claimRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found"));
        claim.setStatus(ClaimStatus.REVISION_REQUESTED);
        claim.setAdminNote(note);
        claim.setAdminSignature(null);
        claim.setAdminSignedAt(null);
        claim.setRevisionDeadline(LocalDateTime.now().plusDays(7));
        claimRepo.save(claim);
        notifService.send(claim.getCustomer(),
                "Claim Revision Required",
                "Additional information is needed for your claim: " + (note != null ? note : "N/A"),
                NotificationType.INFO);
        return ResponseEntity.ok(ClaimResponse.from(claim));
    }
}
