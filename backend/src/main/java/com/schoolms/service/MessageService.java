package com.schoolms.service;

import com.schoolms.model.Message;
import com.schoolms.model.MessageRecipient;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.MessageRecipientRepository;
import com.schoolms.repo.MessageRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.schoolms.web.Util.map;

@Service
public class MessageService {
    private final MessageRepository messages;
    private final MessageRecipientRepository recipients;
    private final UserRepository users;
    private final StudentRepository students;
    private final ParentStudentRepository parentStudents;
    private final NotificationService notifications;

    public MessageService(MessageRepository messages, MessageRecipientRepository recipients, UserRepository users,
                          StudentRepository students, ParentStudentRepository parentStudents,
                          NotificationService notifications) {
        this.messages = messages;
        this.recipients = recipients;
        this.users = users;
        this.students = students;
        this.parentStudents = parentStudents;
        this.notifications = notifications;
    }

    @Transactional
    public Message send(User sender, UUID schoolId, String subject, String body, String audience,
                        String audienceClass, List<UUID> recipientIds) {
        if (subject == null || subject.isBlank()) throw ApiException.badRequest("Add a subject.");
        if (body == null || body.isBlank()) throw ApiException.badRequest("Write a message body.");

        String mode = (audience == null || audience.isBlank()) ? "USER" : audience;
        Set<UUID> resolved = new LinkedHashSet<>();

        switch (mode) {
            case "ALL_PARENTS" -> users.findBySchoolIdAndRoleOrderByFullNameAsc(schoolId, "PARENT")
                    .forEach(u -> resolved.add(u.id));
            case "ALL_STUDENTS" -> users.findBySchoolIdAndRoleOrderByFullNameAsc(schoolId, "STUDENT")
                    .forEach(u -> resolved.add(u.id));
            case "ALL_STAFF" -> users.findBySchoolIdAndRoleIn(schoolId, List.of("TEACHER", "STAFF", "ADMIN"))
                    .forEach(u -> resolved.add(u.id));
            case "CLASS" -> {
                if (audienceClass == null || audienceClass.isBlank()) {
                    throw ApiException.badRequest("Choose a form for this group message.");
                }
                List<Student> classStudents = students
                        .findBySchoolIdAndSchoolClassAndActiveTrueOrderByFirstNameAsc(schoolId, audienceClass);
                if (classStudents.isEmpty()) {
                    throw ApiException.badRequest("No students are enrolled in " + audienceClass + ".");
                }
                for (Student student : classStudents) {
                    if (student.userId != null) resolved.add(student.userId);
                    for (ParentStudent link : parentStudents.findByStudentId(student.id)) {
                        resolved.add(link.parentUserId);
                    }
                }
            }
            case "USER" -> {
                if (recipientIds == null || recipientIds.isEmpty()) {
                    throw ApiException.badRequest("Choose at least one recipient.");
                }
                for (UUID id : recipientIds) {
                    users.findById(id)
                            .filter(u -> u.active && schoolId.equals(u.schoolId))
                            .orElseThrow(() -> ApiException.badRequest("One of the selected recipients is invalid."));
                    resolved.add(id);
                }
            }
            default -> throw ApiException.badRequest("Unknown message audience.");
        }

        resolved.remove(sender.id);
        if (resolved.isEmpty()) {
            throw ApiException.badRequest("There are no recipients for this message yet.");
        }

        Message message = new Message();
        message.schoolId = schoolId;
        message.senderUserId = sender.id;
        message.subject = subject.trim();
        message.body = body.trim();
        message.audience = mode;
        message.audienceClass = audienceClass;
        message = messages.save(message);

        String preview = message.body.length() > 140 ? message.body.substring(0, 137) + "..." : message.body;
        for (UUID userId : resolved) {
            MessageRecipient recipient = new MessageRecipient();
            recipient.messageId = message.id;
            recipient.userId = userId;
            recipients.save(recipient);

            notifications.send(schoolId, userId, "New message: " + message.subject,
                    sender.fullName + " sent you a message. " + preview, "MESSAGE", "MESSAGE", message.id.toString());
        }
        return message;
    }

    public List<Map<String, Object>> inbox(User user) {
        List<MessageRecipient> links = recipients.findByUserIdOrderByReadAtAsc(user.id);
        if (links.isEmpty()) return List.of();

        Map<UUID, MessageRecipient> linkByMessage = links.stream()
                .collect(Collectors.toMap(r -> r.messageId, Function.identity(), (a, b) -> a));
        List<Message> found = messages.findAllById(linkByMessage.keySet());
        Map<UUID, String> senderNames = names(found.stream().map(m -> m.senderUserId).toList());

        return found.stream()
                .sorted(Comparator.comparing((Message m) -> m.sentAt).reversed())
                .map(m -> {
                    MessageRecipient link = linkByMessage.get(m.id);
                    return map(
                            "id", m.id,
                            "subject", m.subject,
                            "body", m.body,
                            "sentAt", m.sentAt,
                            "senderName", senderNames.getOrDefault(m.senderUserId, "Unknown sender"),
                            "readAt", link == null ? null : link.readAt,
                            "audience", m.audience,
                            "folder", "inbox");
                })
                .toList();
    }

    public List<Map<String, Object>> sent(User user) {
        List<Message> found = messages.findBySenderUserIdOrderBySentAtDesc(user.id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Message message : found) {
            List<MessageRecipient> links = recipients.findByMessageId(message.id);
            long read = links.stream().filter(r -> r.readAt != null).count();
            result.add(map(
                    "id", message.id,
                    "subject", message.subject,
                    "body", message.body,
                    "sentAt", message.sentAt,
                    "senderName", user.fullName,
                    "audience", message.audience,
                    "audienceClass", message.audienceClass,
                    "recipientCount", links.size(),
                    "readCount", read,
                    "folder", "sent"));
        }
        return result;
    }

    @Transactional
    public Map<String, Object> detail(User user, UUID messageId) {
        Message message = messages.findById(messageId).orElseThrow(() -> ApiException.notFound("Message not found."));
        if (!message.schoolId.equals(user.schoolId) && !"SUPER_ADMIN".equals(user.role)) {
            throw ApiException.forbidden("You cannot open this message.");
        }
        List<MessageRecipient> links = recipients.findByMessageId(message.id);
        MessageRecipient mine = links.stream().filter(r -> r.userId.equals(user.id)).findFirst().orElse(null);
        boolean isSender = message.senderUserId.equals(user.id);
        if (!isSender && mine == null) throw ApiException.forbidden("You cannot open this message.");

        if (mine != null && mine.readAt == null) {
            mine.readAt = java.time.LocalDateTime.now();
            recipients.save(mine);
        }

        Map<UUID, String> names = names(links.stream().map(r -> r.userId).toList());
        User sender = users.findById(message.senderUserId).orElse(null);
        List<Map<String, Object>> recipientViews = links.stream()
                .map(r -> map("id", r.userId, "name", names.getOrDefault(r.userId, "User"),
                        "readAt", r.readAt))
                .toList();

        return map(
                "id", message.id,
                "subject", message.subject,
                "body", message.body,
                "sentAt", message.sentAt,
                "senderName", sender == null ? "Unknown sender" : sender.fullName,
                "senderRole", sender == null ? null : sender.role,
                "audience", message.audience,
                "audienceClass", message.audienceClass,
                "recipients", recipientViews,
                "readAt", mine == null ? null : mine.readAt);
    }

    public Map<UUID, String> names(List<UUID> ids) {
        Map<UUID, String> names = new HashMap<>();
        for (User user : users.findAllById(new HashSet<>(ids))) {
            names.put(user.id, user.fullName);
        }
        return names;
    }

    public Map<String, Object> recipientDirectory(UUID schoolId) {
        List<Map<String, Object>> parents = users.findBySchoolIdAndRoleOrderByFullNameAsc(schoolId, "PARENT").stream()
                .map(u -> map("id", u.id, "name", u.fullName, "email", u.email)).toList();
        List<Map<String, Object>> studentUsers = users.findBySchoolIdAndRoleOrderByFullNameAsc(schoolId, "STUDENT").stream()
                .map(u -> map("id", u.id, "name", u.fullName, "email", u.email)).toList();
        List<Map<String, Object>> staff = users.findBySchoolIdAndRoleIn(schoolId, List.of("TEACHER", "STAFF", "ADMIN")).stream()
                .map(u -> map("id", u.id, "name", u.fullName, "email", u.email, "role", u.role)).toList();
        return map("parents", parents, "students", studentUsers, "staff", staff,
                "classes", students.findDistinctClasses(schoolId));
    }
}
