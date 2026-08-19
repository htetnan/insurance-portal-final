package com.insurance.portal.controller;

import com.insurance.portal.model.Notification;
import com.insurance.portal.model.User;
import com.insurance.portal.repository.NotificationRepository;
import com.insurance.portal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notifRepo;
    private final UserRepository userRepo;

    /** List all notifications for the currently authenticated user (any role). */
    @GetMapping
    @Transactional(readOnly = true)
    public List<?> getNotifications(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepo.findByEmail(principal.getUsername()).orElseThrow();
        return notifRepo.findAllByRecipientOrderByCreatedAtDesc(user).stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.getId());
            m.put("title", n.getTitle());
            m.put("message", n.getMessage());
            m.put("type", n.getType().name());
            m.put("read", n.isRead());
            m.put("createdAt", n.getCreatedAt());
            return m;
        }).toList();
    }

    @PutMapping("/{id}/read")
    @Transactional
    public ResponseEntity<?> markRead(@PathVariable Long id,
                                      @AuthenticationPrincipal UserDetails principal) {
        User user = userRepo.findByEmail(principal.getUsername()).orElseThrow();
        Notification notification = notifRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        // Ownership check — only recipient can mark their own notification
        if (!notification.getRecipient().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }
        notification.setRead(true);
        notifRepo.save(notification);
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<?> markAllRead(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepo.findByEmail(principal.getUsername()).orElseThrow();
        notifRepo.markAllReadByRecipient(user);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    /** Returns the number of unread notifications for the currently authenticated user. */
    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public Map<String, Object> getUnreadCount(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepo.findByEmail(principal.getUsername()).orElseThrow();
        long count = notifRepo.countByRecipientAndReadFalse(user);
        return Map.of("count", count);
    }
}
