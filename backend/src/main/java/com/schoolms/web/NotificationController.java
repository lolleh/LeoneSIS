package com.schoolms.web;

import com.schoolms.model.Notification;
import com.schoolms.model.User;
import com.schoolms.repo.NotificationRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository notifications;
    private final AccessService access;

    public NotificationController(NotificationRepository notifications, AccessService access) {
        this.notifications = notifications;
        this.access = access;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(defaultValue = "false") boolean unreadOnly) {
        User actor = AuthContext.require();
        access.requireModule(actor, "notifications");
        List<Map<String, Object>> views = notifications.findByUserIdOrderByCreatedAtDesc(actor.id).stream()
                .filter(n -> !unreadOnly || !n.read)
                .map(this::view)
                .toList();
        return map("notifications", views,
                "unread", notifications.countByUserIdAndReadFalse(actor.id));
    }

    @GetMapping("/count")
    public Map<String, Object> count() {
        User actor = AuthContext.require();
        return map("unread", notifications.countByUserIdAndReadFalse(actor.id));
    }

    @PostMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable UUID id) {
        User actor = AuthContext.require();
        Notification notification = notifications.findByIdAndUserId(id, actor.id)
                .orElseThrow(() -> ApiException.notFound("Notification not found."));
        notification.read = true;
        notification.readAt = LocalDateTime.now();
        notifications.save(notification);
        return map("message", "Notification marked as read.",
                "unread", notifications.countByUserIdAndReadFalse(actor.id));
    }

    @PostMapping("/read-all")
    public Map<String, Object> markAllRead() {
        User actor = AuthContext.require();
        List<Notification> all = notifications.findByUserIdOrderByCreatedAtDesc(actor.id);
        for (Notification notification : all) {
            if (!notification.read) {
                notification.read = true;
                notification.readAt = LocalDateTime.now();
            }
        }
        notifications.saveAll(all);
        return map("message", "All notifications marked as read.", "unread", 0);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Map<String, Object> dismiss(@PathVariable UUID id) {
        User actor = AuthContext.require();
        Notification notification = notifications.findByIdAndUserId(id, actor.id)
                .orElseThrow(() -> ApiException.notFound("Notification not found."));
        notifications.delete(notification);
        return map("message", "Notification dismissed.",
                "unread", notifications.countByUserIdAndReadFalse(actor.id));
    }

    private Map<String, Object> view(Notification n) {
        return map("id", n.id, "title", n.title, "body", n.body, "type", n.type,
                "read", n.read, "referenceType", n.referenceType, "referenceId", n.referenceId,
                "createdAt", n.createdAt, "readAt", n.readAt);
    }
}
