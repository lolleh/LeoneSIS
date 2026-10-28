package com.schoolms.web;

import com.schoolms.model.Assessment;
import com.schoolms.model.AttendanceRecord;
import com.schoolms.model.Grade;
import com.schoolms.model.Message;
import com.schoolms.model.Notification;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.School;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.AssessmentRepository;
import com.schoolms.repo.AttendanceRecordRepository;
import com.schoolms.repo.BookRepository;
import com.schoolms.repo.GradeRepository;
import com.schoolms.repo.MessageRecipientRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StaffRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.MessageService;
import com.schoolms.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.round;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final AccessService access;
    private final StudentRepository students;
    private final StaffRepository staff;
    private final UserRepository users;
    private final BookRepository books;
    private final AttendanceRecordRepository attendance;
    private final AssessmentRepository assessments;
    private final GradeRepository grades;
    private final ParentStudentRepository parentStudents;
    private final SchoolRepository schools;
    private final NotificationService notifications;
    private final MessageService messages;
    private final MessageRecipientRepository messageRecipients;

    public DashboardController(AccessService access, StudentRepository students, StaffRepository staff,
                               UserRepository users, BookRepository books, AttendanceRecordRepository attendance,
                               AssessmentRepository assessments, GradeRepository grades,
                               ParentStudentRepository parentStudents, SchoolRepository schools,
                               NotificationService notifications, MessageService messages,
                               MessageRecipientRepository messageRecipients) {
        this.access = access;
        this.students = students;
        this.staff = staff;
        this.users = users;
        this.books = books;
        this.attendance = attendance;
        this.assessments = assessments;
        this.grades = grades;
        this.parentStudents = parentStudents;
        this.schools = schools;
        this.notifications = notifications;
        this.messages = messages;
        this.messageRecipients = messageRecipients;
    }

    @GetMapping
    public Map<String, Object> dashboard(@RequestParam(required = false) UUID schoolId) {
        User user = AuthContext.require();
        UUID scope = access.resolveSchoolId(user, schoolId);

        List<Map<String, Object>> recentNotifications = notifications.recent(user, 5).stream()
                .map(this::notificationView).toList();
        List<Map<String, Object>> recentMessages = messages.inbox(user).stream().limit(4).toList();

        if (!AccessService.isStaffRole(user)) {
            return familyDashboard(user, recentNotifications, recentMessages);
        }

        if (AccessService.isSuperAdmin(user) && scope == null) {
            return platformDashboard(user, recentNotifications, recentMessages);
        }

        return schoolDashboard(user, scope, recentNotifications, recentMessages);
    }

    private Map<String, Object> platformDashboard(User user, List<Map<String, Object>> recentNotifications,
                                                  List<Map<String, Object>> recentMessages) {
        List<School> allSchools = schools.findAllByOrderByNameAsc();
        long totalStudents = students.count();
        long totalStaff = staff.count();
        long totalUsers = users.count();

        List<Map<String, Object>> stats = new ArrayList<>();
        stats.add(map("label", "Schools", "value", allSchools.size(), "hint",
                allSchools.stream().filter(s -> s.active).count() + " active", "icon", "school", "tone", "indigo"));
        stats.add(map("label", "Students", "value", totalStudents, "hint", "across the platform", "icon", "students", "tone", "cyan"));
        stats.add(map("label", "Staff", "value", totalStaff, "hint", "all schools", "icon", "staff", "tone", "violet"));
        stats.add(map("label", "Accounts", "value", totalUsers, "hint", "portal users", "icon", "users", "tone", "amber"));

        List<Map<String, Object>> schoolViews = allSchools.stream()
                .map(s -> map(
                        "id", s.id,
                        "name", s.name,
                        "code", s.code,
                        "city", s.city,
                        "principal", s.principal,
                        "active", s.active,
                        "students", students.countBySchoolIdAndActiveTrue(s.id),
                        "staff", staff.countBySchoolIdAndActiveTrue(s.id),
                        "users", users.countBySchoolId(s.id)))
                .toList();

        return map(
                "scope", "platform",
                "user", user.fullName,
                "schoolName", "All schools",
                "stats", stats,
                "schools", schoolViews,
                "recentNotifications", recentNotifications,
                "recentMessages", recentMessages,
                "children", List.of());
    }

    private Map<String, Object> schoolDashboard(User user, UUID schoolId, List<Map<String, Object>> recentNotifications,
                                                List<Map<String, Object>> recentMessages) {
        School school = schools.findById(schoolId).orElseThrow(() -> ApiException.notFound("School not found."));
        LocalDate today = LocalDate.now();
        List<AttendanceRecord> todayRecords = attendance.findBySchoolIdAndAttendanceDate(schoolId, today);
        long present = todayRecords.stream().filter(r -> !"ABSENT".equals(r.status)).count();
        long absent = todayRecords.stream().filter(r -> "ABSENT".equals(r.status)).count();
        double rate = todayRecords.isEmpty() ? 0 : (present * 100.0 / todayRecords.size());

        long activeStudents = students.countBySchoolIdAndActiveTrue(schoolId);
        List<Map<String, Object>> stats = new ArrayList<>();
        stats.add(map("label", "Students", "value", activeStudents, "hint", "active enrollments", "icon", "students", "tone", "indigo"));
        stats.add(map("label", "Staff", "value", staff.countBySchoolIdAndActiveTrue(schoolId), "hint", "teaching & support", "icon", "staff", "tone", "violet"));
        stats.add(map("label", "Attendance today", "value", todayRecords.isEmpty() ? "Not taken" : round(rate, 1) + "%",
                "hint", todayRecords.isEmpty() ? "No register yet" : present + " present · " + absent + " absent",
                "icon", "attendance", "tone", "emerald"));
        stats.add(map("label", "Portal accounts", "value", users.countBySchoolId(schoolId), "hint", "active users", "icon", "users", "tone", "amber"));
        stats.add(map("label", "Library", "value", books.countBySchoolIdIsNullOrSchoolId(schoolId), "hint", "books & resources", "icon", "library", "tone", "rose"));
        stats.add(map("label", "Unread messages", "value", messageRecipients.countByUserIdAndReadAtIsNull(user.id), "hint", "in your inbox", "icon", "messages", "tone", "blue"));

        return map(
                "scope", "school",
                "schoolName", school.name,
                "schoolCode", school.code,
                "user", user.fullName,
                "stats", stats,
                "classes", students.findDistinctClasses(schoolId),
                "subjectCount", assessments.findDistinctSubjects(schoolId).size(),
                "assessmentCount", assessments.countBySchoolId(schoolId),
                "recentNotifications", recentNotifications,
                "recentMessages", recentMessages,
                "children", List.of(),
                "today", today.toString());
    }

    private Map<String, Object> familyDashboard(User user, List<Map<String, Object>> recentNotifications,
                                                List<Map<String, Object>> recentMessages) {
        List<Student> children = new ArrayList<>();
        if ("PARENT".equals(user.role)) {
            for (ParentStudent link : parentStudents.findByParentUserId(user.id)) {
                students.findById(link.studentId).filter(s -> s.active).ifPresent(children::add);
            }
        } else if ("STUDENT".equals(user.role)) {
            students.findByUserId(user.id).ifPresent(children::add);
        }

        List<Map<String, Object>> childViews = children.stream().map(this::childCard).toList();
        String schoolName = children.isEmpty() ? "My school" : schools.findById(children.get(0).schoolId)
                .map(s -> s.name).orElse("My school");

        List<Map<String, Object>> stats = new ArrayList<>();
        stats.add(map("label", "Children", "value", children.size(), "hint", "linked to your account", "icon", "students", "tone", "indigo"));
        stats.add(map("label", "Unread notifications", "value", notifications.unreadCount(user), "hint", "attendance & grades", "icon", "bell", "tone", "rose"));
        stats.add(map("label", "Unread messages", "value", messageRecipients.countByUserIdAndReadAtIsNull(user.id), "hint", "from teachers", "icon", "messages", "tone", "blue"));
        stats.add(map("label", "Library", "value", children.isEmpty() ? books.countBySchoolIdIsNull()
                        : books.countBySchoolIdIsNullOrSchoolId(children.get(0).schoolId),
                "hint", "books available", "icon", "library", "tone", "amber"));

        return map(
                "scope", "family",
                "user", user.fullName,
                "schoolName", schoolName,
                "stats", stats,
                "children", childViews,
                "recentNotifications", recentNotifications,
                "recentMessages", recentMessages);
    }

    private Map<String, Object> childCard(Student student) {
        List<AttendanceRecord> records = attendance.findByStudentIdOrderByAttendanceDateDesc(student.id);
        long absent = records.stream().filter(r -> "ABSENT".equals(r.status)).count();
        long present = records.stream().filter(r -> !"ABSENT".equals(r.status)).count();
        double rate = records.isEmpty() ? 100 : round(present * 100.0 / records.size(), 1);

        List<Assessment> published = assessments
                .findBySchoolIdAndPublishedTrueOrderByAssessmentDateDesc(student.schoolId);
        Map<UUID, Assessment> byId = published.stream()
                .collect(Collectors.toMap(a -> a.id, a -> a));
        List<Map<String, Object>> recentGrades = grades.findByStudentId(student.id).stream()
                .filter(g -> byId.containsKey(g.assessmentId))
                .sorted(Comparator.comparing((Grade g) -> byId.get(g.assessmentId).assessmentDate).reversed())
                .limit(4)
                .map(g -> {
                    Assessment a = byId.get(g.assessmentId);
                    return map("subject", a.subject, "title", a.title, "type", a.type,
                            "score", g.score, "maxScore", a.maxScore, "letter", g.letter,
                            "date", a.assessmentDate);
                })
                .toList();

        return map(
                "id", student.id,
                "fullName", student.fullName(),
                "admissionNo", student.admissionNo,
                "gradeLevel", student.gradeLevel,
                "schoolClass", student.schoolClass,
                "attendance", map("total", records.size(), "present", present, "absent", absent, "rate", rate),
                "recentGrades", recentGrades,
                "latestAttendance", records.stream().limit(5).map(r -> map(
                        "date", r.attendanceDate, "status", r.status, "comment", r.comment)).toList());
    }

    private Map<String, Object> notificationView(Notification n) {
        return map("id", n.id, "title", n.title, "body", n.body, "type", n.type,
                "read", n.read, "createdAt", n.createdAt);
    }
}
