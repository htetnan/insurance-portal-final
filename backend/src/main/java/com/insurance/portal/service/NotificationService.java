package com.insurance.portal.service;

import com.insurance.portal.model.Notification;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.NotificationType;
import com.insurance.portal.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Central service for sending in-app notifications.
 * Replaces duplicated Notification.builder()…notifRepo.save() blocks
 * that previously appeared inline in every controller.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifRepo;

    /** Send a notification to a single recipient. */
    public void send(User recipient, String title, String message, NotificationType type) {
        notifRepo.save(Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .type(type)
                .build());
    }

    /** Broadcast the same notification to multiple recipients (bulk save). */
    public void sendToAll(List<User> recipients, String title, String message,
                          NotificationType type, String targetRole) {
        List<Notification> notifications = recipients.stream()
                .map(u -> Notification.builder()
                        .recipient(u).title(title).message(message)
                        .type(type).targetRole(targetRole)
                        .build())
                .toList();
        notifRepo.saveAll(notifications);
    }

    /** Count unread notifications for a user (used in dashboard stats). */
    public long countUnread(User user) {
        return notifRepo.findAllByRecipientOrderByCreatedAtDesc(user)
                .stream().filter(n -> !n.isRead()).count();
    }
}
