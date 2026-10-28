package com.schoolms.web;

import com.schoolms.model.Assessment;
import com.schoolms.model.AttendanceRecord;
import com.schoolms.model.Grade;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.School;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.AssessmentRepository;
import com.schoolms.repo.AttendanceRecordRepository;
import com.schoolms.repo.GradeRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.AuthService;
import com.schoolms.service.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.round;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentRepository students;
    private final UserRepository users;
    private final SchoolRepository schools;
    private final ParentStudentRepository parentStudents;
    private final AttendanceRecordRepository attendance;
    private final AssessmentRepository assessments;
    private final GradeRepository grades;
    private final AccessService access;
    private final AuthService auth;
    private final NotificationService notifications;

    public StudentController(StudentRepository students, UserRepository users, SchoolRepository schools,
                             ParentStudentRepository parentStudents, AttendanceRecordRepository attendance,
                             AssessmentRepository assessments, GradeRepository grades, AccessService access,
                             AuthService auth, NotificationService notifications) {
        this.students = students;
        this.users = users;
        this.schools = schools;
        this.parentStudents = parentStudents;
        this.attendance = attendance;
        this.assessments = assessments;
        this.grades = grades;
        this.access = access;
        this.auth = auth;
        this.notifications = notifications;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) String search,
                                    @RequestParam(required = false) String schoolClass) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");

        List<Student> found;
        if ("PARENT".equals(actor.role)) {
            found = new ArrayList<>();
            for (ParentStudent link : parentStudents.findByParentUserId(actor.id)) {
                students.findById(link.studentId).filter(st -> st.active).ifPresent(found::add);
            }
        } else if ("STUDENT".equals(actor.role)) {
            found = students.findByUserId(actor.id).map(List::of).orElse(List.of());
        } else {
            UUID scope = access.resolveSchoolId(actor, schoolId);
            found = scope == null ? students.findAll() : students.findBySchoolIdOrderByFirstNameAsc(scope);
        }

        String needle = search == null ? null : search.trim().toLowerCase();
        List<Map<String, Object>> views = found.stream()
                .filter(st -> st.active)
                .filter(st -> schoolClass == null || schoolClass.isBlank() || schoolClass.equals(st.schoolClass))
                .filter(st -> needle == null || needle.isEmpty()
                        || st.fullName().toLowerCase().contains(needle)
                        || st.admissionNo.toLowerCase().contains(needle)
                        || (st.guardianName != null && st.guardianName.toLowerCase().contains(needle)))
                .sorted(Comparator.comparing(Student::fullName))
                .map(this::view)
                .toList();

        UUID scope = AccessService.isStaffRole(actor) ? access.resolveSchoolId(actor, schoolId) : actor.schoolId;
        return map("students", views,
                "classes", scope == null ? List.of() : students.findDistinctClasses(scope),
                "gradeLevels", scope == null ? List.of() : students.findDistinctGradeLevels(scope));
    }

    @PostMapping
    @Transactional
    public Map<String, Object> enroll(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");
        access.requireManagement(actor);

        UUID schoolId = access.requireSchoolId(actor, Util.uuid(body, "schoolId"));
        School school = schools.findById(schoolId).orElseThrow(() -> ApiException.notFound("School not found."));

        String firstName = s(body, "firstName");
        String lastName = s(body, "lastName");
        if (firstName == null || lastName == null) {
            throw ApiException.badRequest("Student first and last name are required.");
        }

        Student student = new Student();
        student.schoolId = schoolId;
        student.firstName = firstName;
        student.lastName = lastName;
        student.admissionNo = uniqueAdmissionNo(school);
        student.gender = s(body, "gender");
        student.dateOfBirth = parseDate(s(body, "dateOfBirth"));
        student.gradeLevel = s(body, "gradeLevel");
        student.schoolClass = s(body, "schoolClass");
        student.guardianName = s(body, "guardianName");
        student.guardianEmail = s(body, "guardianEmail");
        student.guardianPhone = s(body, "guardianPhone");
        student.address = s(body, "address");
        student.bloodGroup = s(body, "bloodGroup");
        student.notes = s(body, "notes");
        student.active = true;
        student = students.save(student);

        String parentEmail = s(body, "parentEmail");
        if (parentEmail == null) parentEmail = student.guardianEmail;
        if (parentEmail != null) {
            User parent = linkOrCreateParent(school, student, parentEmail, s(body, "parentName"),
                    s(body, "parentPassword"), s(body, "parentUsername"));
            notifications.send(schoolId, parent.id, "Enrollment confirmed",
                    student.fullName() + " has been enrolled in " + orDefault(student.schoolClass, "a form")
                            + " at " + school.name + ". You will receive attendance and grade updates here.",
                    "SYSTEM", "STUDENT", student.id.toString());
        }

        String studentUsername = s(body, "studentUsername");
        if (studentUsername != null) {
            String password = s(body, "studentPassword");
            if (password == null) throw ApiException.badRequest("Set a password for the student portal account.");
            String email = s(body, "studentEmail");
            if (email == null) email = studentUsername.toLowerCase() + "@student." + school.code.toLowerCase() + ".school";
            User portal = auth.createUser(schoolId, studentUsername, email, student.fullName(), password, "STUDENT", "");
            student.userId = portal.id;
            students.save(student);
        }

        return map("student", view(student), "message", student.fullName() + " enrolled successfully.");
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");
        access.requireManagement(actor);

        Student student = students.findById(id).orElseThrow(() -> ApiException.notFound("Student not found."));
        access.requireSchoolAccess(actor, student.schoolId);

        if (s(body, "firstName") != null) student.firstName = s(body, "firstName");
        if (s(body, "lastName") != null) student.lastName = s(body, "lastName");
        if (s(body, "gender") != null) student.gender = s(body, "gender");
        if (s(body, "gradeLevel") != null) student.gradeLevel = s(body, "gradeLevel");
        if (s(body, "schoolClass") != null) student.schoolClass = s(body, "schoolClass");
        if (s(body, "guardianName") != null) student.guardianName = s(body, "guardianName");
        if (s(body, "guardianEmail") != null) student.guardianEmail = s(body, "guardianEmail");
        if (s(body, "guardianPhone") != null) student.guardianPhone = s(body, "guardianPhone");
        if (s(body, "address") != null) student.address = s(body, "address");
        if (s(body, "bloodGroup") != null) student.bloodGroup = s(body, "bloodGroup");
        if (s(body, "notes") != null) student.notes = s(body, "notes");
        if (s(body, "dateOfBirth") != null) student.dateOfBirth = parseDate(s(body, "dateOfBirth"));
        if (body.containsKey("active")) student.active = Util.b(body, "active", student.active);

        String admissionNo = s(body, "admissionNo");
        if (admissionNo != null && !admissionNo.equals(student.admissionNo)) {
            if (students.existsBySchoolIdAndAdmissionNo(student.schoolId, admissionNo)) {
                throw ApiException.conflict("Admission number " + admissionNo + " is already in use.");
            }
            student.admissionNo = admissionNo;
        }

        students.save(student);
        return map("student", view(student), "message", "Student record updated.");
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deactivate(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");
        access.requireManagement(actor);
        Student student = students.findById(id).orElseThrow(() -> ApiException.notFound("Student not found."));
        access.requireSchoolAccess(actor, student.schoolId);
        student.active = false;
        students.save(student);
        return map("message", student.fullName() + " has been removed from active enrollment.");
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        User actor = AuthContext.require();
        Student student = students.findById(id).orElseThrow(() -> ApiException.notFound("Student not found."));
        assertCanView(actor, student);

        List<AttendanceRecord> records = attendance.findByStudentIdOrderByAttendanceDateDesc(student.id);
        long absent = records.stream().filter(r -> "ABSENT".equals(r.status)).count();
        long present = records.size() - absent;
        double rate = records.isEmpty() ? 100 : round(present * 100.0 / records.size(), 1);

        Map<UUID, Assessment> assessmentMap = assessments
                .findBySchoolIdAndPublishedTrueOrderByAssessmentDateDesc(student.schoolId).stream()
                .collect(Collectors.toMap(a -> a.id, a -> a));
        List<Map<String, Object>> gradeViews = new ArrayList<>();
        for (Grade g : grades.findByStudentId(student.id)) {
            Assessment a = assessmentMap.get(g.assessmentId);
            if (a == null) continue;
            gradeViews.add(map("id", g.id, "subject", a.subject, "title", a.title, "type", a.type,
                    "score", g.score, "maxScore", a.maxScore, "letter", g.letter,
                    "comment", g.comment, "date", a.assessmentDate));
        }
        gradeViews.sort(Comparator.comparing((Map<String, Object> m) -> (LocalDate) m.get("date")).reversed());

        return map(
                "student", view(student),
                "attendance", map("total", records.size(), "present", present, "absent", absent, "rate", rate,
                        "recent", records.stream().limit(10).map(r -> map("date", r.attendanceDate,
                                "status", r.status, "comment", r.comment)).toList()),
                "grades", gradeViews.stream().limit(12).toList());
    }

    @PostMapping("/{id}/parents")
    @Transactional
    public Map<String, Object> addParent(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");
        access.requireManagement(actor);
        Student student = students.findById(id).orElseThrow(() -> ApiException.notFound("Student not found."));
        access.requireSchoolAccess(actor, student.schoolId);
        School school = schools.findById(student.schoolId).orElseThrow(() -> ApiException.notFound("School not found."));

        String email = s(body, "email");
        if (email == null) throw ApiException.badRequest("A parent email is required.");
        User parent = linkOrCreateParent(school, student, email, s(body, "fullName"),
                s(body, "password"), s(body, "username"));
        notifications.send(student.schoolId, parent.id, "Linked to " + student.fullName(),
                "You are now linked as a guardian for " + student.fullName() + " at " + school.name
                        + ". Attendance alerts and grades will appear in your portal.",
                "SYSTEM", "STUDENT", student.id.toString());
        return map("student", view(student), "message", "Guardian linked.");
    }

    @DeleteMapping("/{id}/parents/{userId}")
    @Transactional
    public Map<String, Object> removeParent(@PathVariable UUID id, @PathVariable UUID userId) {
        User actor = AuthContext.require();
        access.requireModule(actor, "students");
        access.requireManagement(actor);
        Student student = students.findById(id).orElseThrow(() -> ApiException.notFound("Student not found."));
        access.requireSchoolAccess(actor, student.schoolId);
        parentStudents.deleteByParentUserIdAndStudentId(userId, student.id);
        return map("student", view(student), "message", "Guardian unlinked.");
    }

    private User linkOrCreateParent(School school, Student student, String email, String name,
                                    String password, String username) {
        User parent = users.findByEmailIgnoreCase(email).orElse(null);
        if (parent != null) {
            if (!"PARENT".equals(parent.role)) {
                throw ApiException.conflict("The email " + email + " belongs to a non-parent account.");
            }
            if (!school.id.equals(parent.schoolId)) {
                throw ApiException.conflict("That parent account belongs to another school.");
            }
        } else {
            if (password == null || password.length() < 6) {
                throw ApiException.badRequest("A password of at least 6 characters is required to create the parent's portal account.");
            }
            String baseUsername = username;
            if (baseUsername == null) {
                baseUsername = email.substring(0, email.indexOf('@')).toLowerCase().replaceAll("[^a-z0-9.]", "");
                if (baseUsername.isBlank()) baseUsername = "parent";
            }
            String uniqueUsername = baseUsername;
            int suffix = 1;
            while (users.existsByUsernameIgnoreCase(uniqueUsername)) {
                uniqueUsername = baseUsername + suffix++;
            }
            parent = auth.createUser(school.id, uniqueUsername, email,
                    name == null ? orDefault(student.guardianName, "Parent of " + student.fullName()) : name,
                    password, "PARENT", "");
        }

        if (!parentStudents.existsByParentUserIdAndStudentId(parent.id, student.id)) {
            ParentStudent link = new ParentStudent();
            link.parentUserId = parent.id;
            link.studentId = student.id;
            parentStudents.save(link);
        }
        if (student.guardianEmail == null) student.guardianEmail = parent.email;
        if (student.guardianName == null) student.guardianName = parent.fullName;
        students.save(student);
        return parent;
    }

    private void assertCanView(User actor, Student student) {
        if (AccessService.isStaffRole(actor)) {
            access.requireSchoolAccess(actor, student.schoolId);
            return;
        }
        if ("PARENT".equals(actor.role)) {
            if (parentStudents.existsByParentUserIdAndStudentId(actor.id, student.id)) return;
        }
        if ("STUDENT".equals(actor.role) && actor.id.equals(student.userId)) return;
        throw ApiException.forbidden("You cannot view this student's record.");
    }

    private Map<String, Object> view(Student student) {
        List<Map<String, Object>> parents = new ArrayList<>();
        for (ParentStudent link : parentStudents.findByStudentId(student.id)) {
            users.findById(link.parentUserId).ifPresent(parent -> parents.add(map(
                    "userId", parent.id,
                    "name", parent.fullName,
                    "email", parent.email,
                    "username", parent.username,
                    "active", parent.active)));
        }

        School school = schools.findById(student.schoolId).orElse(null);
        return map(
                "id", student.id,
                "schoolId", student.schoolId,
                "schoolName", school == null ? null : school.name,
                "admissionNo", student.admissionNo,
                "firstName", student.firstName,
                "lastName", student.lastName,
                "fullName", student.fullName(),
                "gender", student.gender,
                "dateOfBirth", student.dateOfBirth,
                "gradeLevel", student.gradeLevel,
                "schoolClass", student.schoolClass,
                "guardianName", student.guardianName,
                "guardianEmail", student.guardianEmail,
                "guardianPhone", student.guardianPhone,
                "address", student.address,
                "bloodGroup", student.bloodGroup,
                "notes", student.notes,
                "enrolledAt", student.enrolledAt,
                "active", student.active,
                "hasPortalAccount", student.userId != null,
                "parents", parents);
    }

    private String uniqueAdmissionNo(School school) {
        for (int i = 0; i < 50; i++) {
            String candidate = school.code + "-" + String.format("%04d", (int) (Math.random() * 9000) + 1000);
            if (!students.existsBySchoolIdAndAdmissionNo(school.id, candidate)) return candidate;
        }
        return school.code + "-" + System.currentTimeMillis();
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Enter dates in YYYY-MM-DD format.");
        }
    }

    private String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
