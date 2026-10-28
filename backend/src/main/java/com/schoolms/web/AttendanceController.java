package com.schoolms.web;

import com.schoolms.model.AttendanceRecord;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.AttendanceRecordRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.round;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
    private static final List<String> STATUSES = List.of("PRESENT", "ABSENT", "LATE", "EXCUSED");

    private final AttendanceRecordRepository attendance;
    private final StudentRepository students;
    private final ParentStudentRepository parentStudents;
    private final NotificationService notifications;
    private final AccessService access;

    public AttendanceController(AttendanceRecordRepository attendance, StudentRepository students,
                                ParentStudentRepository parentStudents, NotificationService notifications,
                                AccessService access) {
        this.attendance = attendance;
        this.students = students;
        this.parentStudents = parentStudents;
        this.notifications = notifications;
        this.access = access;
    }

    @GetMapping
    public Map<String, Object> get(@RequestParam(required = false) String date,
                                   @RequestParam(required = false) String schoolClass,
                                   @RequestParam(required = false) UUID studentId,
                                   @RequestParam(required = false) UUID schoolId) {
        User actor = AuthContext.require();
        access.requireModule(actor, "attendance");

        if (!AccessService.isStaffRole(actor)) {
            return familyView(actor, studentId);
        }

        UUID scope = access.requireSchoolId(actor, schoolId);
        LocalDate target = parseDate(date, LocalDate.now());

        List<Student> roster = (schoolClass == null || schoolClass.isBlank())
                ? students.findBySchoolIdAndActiveTrueOrderByFirstNameAsc(scope)
                : students.findBySchoolIdAndSchoolClassAndActiveTrueOrderByFirstNameAsc(scope, schoolClass);

        Map<UUID, AttendanceRecord> records = new HashMap<>();
        for (AttendanceRecord record : attendance.findBySchoolIdAndAttendanceDate(scope, target)) {
            records.put(record.studentId, record);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        long present = 0, absent = 0, late = 0, excused = 0, unmarked = 0;
        for (Student student : roster) {
            AttendanceRecord record = records.get(student.id);
            String status = record == null ? null : record.status;
            if (record == null) unmarked++;
            else if ("ABSENT".equals(status)) absent++;
            else if ("LATE".equals(status)) late++;
            else if ("EXCUSED".equals(status)) excused++;
            else present++;

            rows.add(map(
                    "studentId", student.id,
                    "fullName", student.fullName(),
                    "admissionNo", student.admissionNo,
                    "schoolClass", student.schoolClass,
                    "guardianName", student.guardianName,
                    "guardianEmail", student.guardianEmail,
                    "status", status,
                    "comment", record == null ? null : record.comment,
                    "markedAt", record == null ? null : record.createdAt,
                    "hasParentAccount", !notifications.parentsOf(student).isEmpty()));
        }

        return map(
                "mode", "roster",
                "date", target,
                "schoolClass", schoolClass,
                "students", rows,
                "classes", students.findDistinctClasses(scope),
                "summary", map("total", roster.size(), "present", present, "absent", absent,
                        "late", late, "excused", excused, "unmarked", unmarked,
                        "rate", roster.isEmpty() ? 0 : round(present * 100.0 / roster.size(), 1)));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> save(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "attendance");
        if (!AccessService.isStaffRole(actor)) {
            throw ApiException.forbidden("Only teachers and staff can take attendance.");
        }
        UUID scope = access.requireSchoolId(actor, Util.uuid(body, "schoolId"));
        LocalDate target = parseDate(s(body, "date"), LocalDate.now());

        Object rawRecords = body.get("records");
        if (!(rawRecords instanceof List<?> list) || list.isEmpty()) {
            throw ApiException.badRequest("There are no attendance entries to save.");
        }

        int saved = 0;
        int alerts = 0;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> entry)) continue;
            String studentIdValue = entry.get("studentId") == null ? null : String.valueOf(entry.get("studentId"));
            String status = entry.get("status") == null ? null : String.valueOf(entry.get("status")).toUpperCase();
            if (studentIdValue == null) continue;
            if (!STATUSES.contains(status)) {
                throw ApiException.badRequest("Invalid attendance status: " + status);
            }
            UUID studentKey;
            try {
                studentKey = UUID.fromString(studentIdValue);
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Invalid student in attendance register.");
            }
            Student student = students.findById(studentKey)
                    .orElseThrow(() -> ApiException.notFound("A student in the register no longer exists."));
            if (!student.schoolId.equals(scope)) {
                throw ApiException.forbidden("The register contains a student from another school.");
            }

            Object commentValue = entry.get("comment");
            String comment = commentValue == null ? null : Util.clean(String.valueOf(commentValue));

            AttendanceRecord record = attendance.findByStudentIdAndAttendanceDate(student.id, target)
                    .orElseGet(AttendanceRecord::new);
            record.schoolId = scope;
            record.studentId = student.id;
            record.attendanceDate = target;
            record.status = status;
            record.comment = comment;
            record.markedByUserId = actor.id;
            attendance.save(record);
            saved++;

            if ("ABSENT".equals(status)) {
                alerts += notifications.notifyAbsence(student, target, actor.fullName, comment);
            }
        }

        return map("saved", saved, "notificationsSent", alerts, "date", target,
                "message", alerts > 0
                        ? alerts + " absence alert" + (alerts == 1 ? "" : "s") + " sent to parents."
                        : "Attendance saved.");
    }

    private Map<String, Object> familyView(User actor, UUID requestedStudentId) {
        List<Student> children = new ArrayList<>();
        if ("PARENT".equals(actor.role)) {
            for (ParentStudent link : parentStudents.findByParentUserId(actor.id)) {
                students.findById(link.studentId).filter(st -> st.active).ifPresent(children::add);
            }
        } else if ("STUDENT".equals(actor.role)) {
            students.findByUserId(actor.id).ifPresent(children::add);
        }

        if (requestedStudentId != null) {
            children.removeIf(child -> !child.id.equals(requestedStudentId));
        }
        if (children.isEmpty()) {
            return map("mode", "family", "children", List.of(),
                    "message", "No student records are linked to this account yet.");
        }

        List<Map<String, Object>> cards = new ArrayList<>();
        for (Student child : children) {
            List<AttendanceRecord> records = attendance.findByStudentIdOrderByAttendanceDateDesc(child.id);
            long absent = records.stream().filter(r -> "ABSENT".equals(r.status)).count();
            long present = records.stream().filter(r -> !"ABSENT".equals(r.status)).count();
            cards.add(map(
                    "student", map("id", child.id, "fullName", child.fullName(),
                            "schoolClass", child.schoolClass, "admissionNo", child.admissionNo,
                            "gradeLevel", child.gradeLevel),
                    "total", records.size(),
                    "present", present,
                    "absent", absent,
                    "rate", records.isEmpty() ? 100 : round(present * 100.0 / records.size(), 1),
                    "records", records.stream().limit(60).map(r -> map(
                            "date", r.attendanceDate, "status", r.status, "comment", r.comment)).toList()));
        }
        return map("mode", "family", "children", cards, "today", LocalDate.now());
    }

    private LocalDate parseDate(String value, LocalDate fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Enter dates in YYYY-MM-DD format.");
        }
    }
}
