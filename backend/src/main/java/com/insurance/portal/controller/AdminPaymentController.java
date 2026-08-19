package com.insurance.portal.controller;

import com.insurance.portal.dto.PaymentResponse;
import com.insurance.portal.model.Payment;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.NotificationType;
import com.insurance.portal.model.enums.PaymentStatus;
import com.insurance.portal.repository.PaymentRepository;
import com.insurance.portal.repository.UserRepository;
import com.insurance.portal.service.NotificationService;
import com.insurance.portal.util.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/payments")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminPaymentController {

    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final NotificationService notifService;

    @GetMapping("/page")
    @Transactional(readOnly = true)
    public Map<String, Object> getPage(@RequestParam(required = false) String status,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        int safeSize = Math.min(Math.max(size, 5), 100);
        var pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        org.springframework.data.domain.Page<com.insurance.portal.model.Payment> result;
        if (status != null && !status.equalsIgnoreCase("ALL")) {
            try {
                result = paymentRepo.findAllByStatus(PaymentStatus.valueOf(status), pageable);
            } catch (IllegalArgumentException ex) {
                result = paymentRepo.findAll(pageable);
            }
        } else {
            result = paymentRepo.findAll(pageable);
        }
        var mapped = result.map(PaymentResponse::from);
        return Map.of("content", mapped.getContent(), "page", mapped.getNumber(), "size", mapped.getSize(),
                "totalElements", mapped.getTotalElements(), "totalPages", mapped.getTotalPages());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(@RequestParam(required = false) String status) {
        List<Payment> payments;
        if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                payments = paymentRepo.findAllByStatus(PaymentStatus.valueOf(status));
            } catch (IllegalArgumentException e) {
                payments = paymentRepo.findAll();
            }
        } else {
            payments = paymentRepo.findAll();
        }
        return payments.stream()
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .map(PaymentResponse::from).toList();
    }

    @PutMapping("/{id}/verify")
    @Transactional
    public ResponseEntity<?> verifyPayment(@PathVariable Long id, @RequestBody(required = false) Map<String, String> req,
                                           @AuthenticationPrincipal UserDetails principal) {
        Payment payment = paymentRepo.findById(id).orElseThrow(() -> new RuntimeException("Payment not found"));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only PENDING payments can be verified"));
        }
        User admin = userRepo.findByEmail(principal.getUsername()).orElse(null);
        payment.setStatus(PaymentStatus.VERIFIED);
        payment.setVerifiedBy(admin != null ? admin.getName() : "Admin");
        if (req != null && req.get("note") != null) payment.setNotes(req.get("note"));
        paymentRepo.save(payment);
        notifService.send(payment.getCustomer(),
                "Payment Verified",
                "Your payment of " + payment.getAmount() + " MMK has been verified. Thank you!",
                NotificationType.PAYMENT);
        return ResponseEntity.ok(PaymentResponse.from(payment));
    }

    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectPayment(@PathVariable Long id, @RequestBody(required = false) Map<String, String> req) {
        Payment payment = paymentRepo.findById(id).orElseThrow(() -> new RuntimeException("Payment not found"));
        if (payment.getStatus() != PaymentStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only PENDING payments can be rejected"));
        }
        String note = req != null ? req.getOrDefault("note", "N/A") : "N/A";
        payment.setStatus(PaymentStatus.REJECTED);
        payment.setNotes(note);
        paymentRepo.save(payment);
        notifService.send(payment.getCustomer(),
                "Payment Rejected",
                "Your payment submission was rejected. Reason: " + note + ". Please resubmit with a valid screenshot.",
                NotificationType.REJECTION);
        return ResponseEntity.ok(PaymentResponse.from(payment));
    }

    @GetMapping("/{id}/screenshot")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getScreenshot(@PathVariable Long id) {
        Payment payment = paymentRepo.findById(id).orElseThrow(() -> new RuntimeException("Payment not found"));
        if (payment.getScreenshotPath() == null || payment.getScreenshotPath().isBlank()) {
            return ResponseEntity.notFound().build();
        }
        return FileStorageUtil.streamFile(payment.getScreenshotPath());
    }
}
