package com.schoolms.web;

import com.schoolms.model.User;
import com.schoolms.repo.MessageRecipientRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.MessageService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/messages")
public class MessageController {
    private final MessageService messages;
    private final MessageRecipientRepository recipients;
    private final AccessService access;

    public MessageController(MessageService messages, MessageRecipientRepository recipients, AccessService access) {
        this.messages = messages;
        this.recipients = recipients;
        this.access = access;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(defaultValue = "inbox") String folder) {
        User actor = AuthContext.require();
        access.requireModule(actor, "messages");
        List<Map<String, Object>> list = "sent".equalsIgnoreCase(folder)
                ? messages.sent(actor)
                : messages.inbox(actor);
        return map("messages", list, "folder", folder,
                "unread", recipients.countByUserIdAndReadAtIsNull(actor.id));
    }

    @GetMapping("/directory")
    public Map<String, Object> directory(@RequestParam(required = false) UUID schoolId) {
        User actor = AuthContext.require();
        access.requireModule(actor, "messages");
        UUID scope = access.requireSchoolId(actor, schoolId);
        Map<String, Object> directory = messages.recipientDirectory(scope);
        if (!AccessService.isStaffRole(actor)) {
            directory.put("parents", List.of());
            directory.put("students", List.of());
        }
        return directory;
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "messages");
        return map("message", messages.detail(actor, id));
    }

    @PostMapping
    public Map<String, Object> send(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "messages");
        UUID scope = access.requireSchoolId(actor, Util.uuid(body, "schoolId"));

        String audience = s(body, "audience");
        if (!AccessService.isStaffRole(actor)
                && audience != null && !"USER".equals(audience)) {
            throw ApiException.forbidden("Only staff can send group messages.");
        }

        messages.send(actor, scope, s(body, "subject"), s(body, "body"), audience,
                s(body, "audienceClass"), Util.uuidList(body.get("recipientIds")));

        return map("message", "Message sent successfully.");
    }
}
