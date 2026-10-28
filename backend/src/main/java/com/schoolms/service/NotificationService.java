package com.schoolms.service;

import com.schoolms.model.AttendanceRecord;
import com.schoolms.model.Assessment;
import com.schoolms.model.Grade;
import com.schoolms.model.Notification;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.NotificationRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class NotificationService {
    private static final DateTimeFormatter PRETTY_DATE = DateTimeFormatter.ofPattern("d MMM yyyy");

    private final NotificationRepository notifications;
    private final ParentStudentRepository parentStudents;
    private final UserRepository users;

    public NotificationService(NotificationRepository notifications, ParentStudentRepository parentStudents,
                               UserRepository users) {
        this.notifications = notifications;
        this.parentStudents = parentStudents;
        this.users = users;
    }

    public Notification send(UUID schoolId, UUID userId, String title, String body, String type,
                             String referenceType, String referenceId) {
        Notification notification = new Notification();
        notification.schoolId = schoolId;
        notification.userId = userId;
        notification.title = title;
        notification.body = body;
        notification.type = type;
        notification.referenceType = referenceType;
        notification.referenceId = referenceId;
        return notifications.save(notification);
    }

    public int sendMany(Set<UUID> userIds, UUID schoolId, String title, String body, String type,
                        String referenceType, String referenceId) {
        int count = 0;
        for (UUID userId : userIds) {
            send(schoolId, userId, title, body, type, referenceType, referenceId);
            count++;
        }
        return count;
    }

    /** All active portal accounts belonging to parents/guardians of a student. */
    public List<User> parentsOf(Student student) {
        List<User> parents = new ArrayList<>();
        for (ParentStudent link : parentStudents.findByStudentId(student.id)) {
            users.findById(link.parentUserId)
                    .filter(u -> u.active && "PARENT".equals(u.role))
                    .ifPresent(parents::add);
        }
        return parents;
    }

    public List<User> guardiansAndStudent(Student student) {
        List<User> recipients = new ArrayList<>(parentsOf(student));
        if (student.userId != null) {
            users.findById(student.userId).filter(u -> u.active).ifPresent(recipients::add);
        }
        return recipients;
    }

    /**
     * Creates an absence notification for every linked guardian (and the student
     * portal account). Duplicate notifications for the same student/day are suppressed
     * so re-saving a register does not spam families.
     */
    @Transactional
    public int notifyAbsence(Student student, LocalDate date, String markedBy, String comment) {
        String referenceId = student.id + ":" + date;
        String reason = (comment == null || comment.isBlank()) ? "No reason recorded." : comment;
        String title = "Absence alert: " + student.fullName();
        String body = String.format(
                "%s (%s%s) was marked absent on %s.%s Marked by %s. If this is unexpected, please contact the school office.",
                student.fullName(),
                student.schoolClass == null ? "student" : student.schoolClass,
                student.admissionNo == null ? "" : ", admission " + student.admissionNo,
                date.format(PRETTY_DATE),
                reason.equals("No reason recorded.") ? "" : " Note: " + reason,
                markedBy == null ? "the form teacher" : markedBy);

        int sent = 0;
        for (User recipient : guardiansAndStudent(student)) {
            if (notifications.existsByUserIdAndReferenceTypeAndReferenceId(
                    recipient.id, "ATTENDANCE", referenceId)) {
                continue;
            }
            send(student.schoolId, recipient.id, title, body, "ATTENDANCE", "ATTENDANCE", referenceId);
            sent++;
        }
        return sent;
    }

    @Transactional
    public int notifyGradePublished(Assessment assessment, Grade grade, Student student) {
        String title = "Grade posted: " + assessment.subject;
        String body = String.format("A grade has been posted for %s in %s (%s). %s scored %s on %s.",
                student.fullName(), assessment.subject, assessment.type,
                student.firstName,
                grade.letter == null ? String.valueOf(grade.score) : grade.letter + " (" + grade.score + "/" + formatMax(assessment.maxScore) + ")",
                assessment.title);
        String referenceId = assessment.id + ":" + student.id;
        int sent = 0;
        for (User recipient : guardiansAndStudent(student)) {
            if (notifications.existsByUserIdAndReferenceTypeAndReferenceId(recipient.id, "GRADE", referenceId)) continue;
            send(student.schoolId, recipient.id, title, body, "GRADE", "GRADE", referenceId);
            sent++;
        }
        return sent;
    }

    public int notifyAttendanceUpdated(Student student, AttendanceRecord record, String markedBy) {
        if ("ABSENT".equals(record.status)) {
            return notifyAbsence(student, record.attendanceDate, markedBy, record.comment);
        }
        return 0;
    }

    public List<Notification> recent(User user, int limit) {
        return notifications.findByUserIdOrderByCreatedAtDesc(user.id).stream().limit(limit).toList();
    }

    public long unreadCount(User user) {
        return notifications.countByUserIdAndReadFalse(user.id);
    }

    private String formatMax(double max) {
        return max == Math.floor(max) ? String.valueOf((long) max) : String.valueOf(max);
    }

    public Set<UUID> distinctIds(List<User> recipients) {
        Set<UUID> ids = new LinkedHashSet<>();
        for (User user : recipients) ids.add(user.id);
        return ids;
    }
}
