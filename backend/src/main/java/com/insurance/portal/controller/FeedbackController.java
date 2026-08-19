package com.insurance.portal.controller;

import com.insurance.portal.model.Feedback;
import com.insurance.portal.model.User;
import com.insurance.portal.repository.FeedbackRepository;
import com.insurance.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepo;
    private final UserRepository userRepo;

    // ── Customer: submit feedback ─────────────────────────────────────
    @PostMapping("/customer/feedback")
    @Transactional
    public ResponseEntity<?> submitFeedback(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody Map<String, Object> body) {

        User customer = userRepo.findByEmail(principal.getUsername()).orElseThrow();

        int rating = Integer.parseInt(body.getOrDefault("rating", "5").toString());
        if (rating < 1 || rating > 5)
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5"));

        String message = body.getOrDefault("message", "").toString().trim();
        if (message.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("message", "Message is required"));

        String category = body.getOrDefault("category", "General").toString();

        Feedback feedback = Feedback.builder()
                .customer(customer)
                .rating(rating)
                .category(category)
                .message(message)
                .read(false)
                .build();

        feedbackRepo.save(feedback);
        return ResponseEntity.ok(Map.of("message", "Feedback submitted successfully"));
    }

    // ── Admin: paginated feedback list (fast for large datasets) ─────
    @GetMapping("/admin/feedback")
    @Transactional(readOnly = true)
    public Map<String, Object> getFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "ALL") String status) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 10), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Feedback> result = switch (status.toUpperCase()) {
            case "UNREAD" -> feedbackRepo.findByReadFalseOrderByCreatedAtDesc(pageable);
            case "READ" -> feedbackRepo.findByReadTrueOrderByCreatedAtDesc(pageable);
            default -> feedbackRepo.findAllByOrderByCreatedAtDesc(pageable);
        };

        var content = result.getContent().stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("customerName", f.getCustomer().getName());
            m.put("customerEmail", f.getCustomer().getEmail());
            m.put("rating", f.getRating());
            m.put("category", f.getCategory());
            m.put("message", f.getMessage());
            m.put("read", f.isRead());
            m.put("createdAt", f.getCreatedAt());
            return m;
        }).toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("page", result.getNumber());
        response.put("size", result.getSize());
        response.put("totalElements", result.getTotalElements());
        response.put("totalPages", result.getTotalPages());
        response.put("first", result.isFirst());
        response.put("last", result.isLast());
        response.put("unreadCount", feedbackRepo.countByReadFalse());
        return response;
    }

    // ── Admin: unread count (for sidebar badge) ───────────────────────
    @GetMapping("/admin/feedback/unread-count")
    @Transactional(readOnly = true)
    public Map<String, Object> getUnreadCount() {
        return Map.of("count", feedbackRepo.countByReadFalse());
    }

    // ── Admin: mark one as read ───────────────────────────────────────
    @PutMapping("/admin/feedback/{id}/read")
    @Transactional
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        Feedback f = feedbackRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        f.setRead(true);
        feedbackRepo.save(f);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    // ── Admin: mark all as read ───────────────────────────────────────
    @PutMapping("/admin/feedback/read-all")
    @Transactional
    public ResponseEntity<?> markAllRead() {
        int updated = feedbackRepo.markAllAsRead();
        return ResponseEntity.ok(Map.of("message", "All feedback marked as read", "updated", updated));
    }
}
