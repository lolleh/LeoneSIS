package com.schoolms.web;

import com.schoolms.model.Assessment;
import com.schoolms.model.Grade;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.AssessmentRepository;
import com.schoolms.repo.GradeRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.round;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/grades")
public class GradeController {
    private static final List<String> TYPES = List.of("QUIZ", "ASSIGNMENT", "TEST", "EXAM", "PROJECT");

    private final AssessmentRepository assessments;
    private final GradeRepository grades;
    private final StudentRepository students;
    private final ParentStudentRepository parentStudents;
    private final UserRepository users;
    private final AccessService access;
    private final NotificationService notifications;

    public GradeController(AssessmentRepository assessments, GradeRepository grades, StudentRepository students,
                           ParentStudentRepository parentStudents, UserRepository users, AccessService access,
                           NotificationService notifications) {
        this.assessments = assessments;
        this.grades = grades;
        this.students = students;
        this.parentStudents = parentStudents;
        this.users = users;
        this.access = access;
        this.notifications = notifications;
    }

    @GetMapping("/assessments")
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) String schoolClass,
                                    @RequestParam(required = false) String subject) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");

        if (!AccessService.isStaffRole(actor)) {
            return myGrades(actor);
        }

        UUID scope = access.requireSchoolId(actor, schoolId);
        List<Assessment> found = (schoolClass == null || schoolClass.isBlank())
                ? assessments.findBySchoolIdOrderByAssessmentDateDesc(scope)
                : assessments.findBySchoolIdAndSchoolClassOrderByAssessmentDateDesc(scope, schoolClass);

        List<Map<String, Object>> views = found.stream()
                .filter(a -> subject == null || subject.isBlank() || subject.equalsIgnoreCase(a.subject))
                .map(this::assessmentView)
                .toList();

        return map("assessments", views,
                "classes", students.findDistinctClasses(scope),
                "subjects", assessments.findDistinctSubjects(scope));
    }

    @PostMapping("/assessments")
    public Map<String, Object> createAssessment(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        requireGrader(actor);
        UUID scope = access.requireSchoolId(actor, Util.uuid(body, "schoolId"));

        String title = s(body, "title");
        String subject = s(body, "subject");
        String type = s(body, "type");
        if (title == null) throw ApiException.badRequest("Give the assessment a title.");
        if (subject == null) throw ApiException.badRequest("Choose a subject.");
        if (type == null || !TYPES.contains(type.toUpperCase())) {
            throw ApiException.badRequest("Choose a valid assessment type.");
        }

        Assessment assessment = new Assessment();
        assessment.schoolId = scope;
        assessment.title = title;
        assessment.subject = subject;
        assessment.type = type.toUpperCase();
        assessment.gradeLevel = s(body, "gradeLevel");
        assessment.schoolClass = s(body, "schoolClass");
        assessment.maxScore = number(body.get("maxScore"), 100);
        if (assessment.maxScore <= 0) throw ApiException.badRequest("Maximum score must be greater than zero.");
        assessment.assessmentDate = parseDate(s(body, "assessmentDate"));
        assessment.postedByUserId = actor.id;
        assessment.published = Util.b(body, "published", false);
        assessments.save(assessment);

        return map("assessment", assessmentView(assessment), "message", "Assessment created. Add scores when ready.");
    }

    @GetMapping("/assessments/{id}")
    public Map<String, Object> assessmentDetail(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        requireGrader(actor);
        Assessment assessment = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment not found."));
        access.requireSchoolAccess(actor, assessment.schoolId);

        List<Student> roster = (assessment.schoolClass == null || assessment.schoolClass.isBlank())
                ? students.findBySchoolIdAndActiveTrueOrderByFirstNameAsc(assessment.schoolId)
                : students.findBySchoolIdAndSchoolClassAndActiveTrueOrderByFirstNameAsc(assessment.schoolId, assessment.schoolClass);

        Map<UUID, Grade> existing = grades.findByAssessmentId(id).stream()
                .collect(Collectors.toMap(g -> g.studentId, g -> g));
        List<Map<String, Object>> rows = roster.stream().map(student -> {
            Grade grade = existing.get(student.id);
            return map(
                    "studentId", student.id,
                    "fullName", student.fullName(),
                    "admissionNo", student.admissionNo,
                    "schoolClass", student.schoolClass,
                    "score", grade == null ? null : grade.score,
                    "letter", grade == null ? null : grade.letter,
                    "comment", grade == null ? null : grade.comment);
        }).toList();

        return map("assessment", assessmentView(assessment), "students", rows);
    }

    @PostMapping("/assessments/{id}/entries")
    @Transactional
    public Map<String, Object> saveGrades(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        requireGrader(actor);

        Assessment assessment = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment not found."));
        access.requireSchoolAccess(actor, assessment.schoolId);

        Object rawEntries = body.get("entries");
        if (!(rawEntries instanceof List<?> entries) || entries.isEmpty()) {
            throw ApiException.badRequest("There are no scores to save.");
        }

        int saved = 0;
        int notified = 0;
        for (Object item : entries) {
            if (!(item instanceof Map<?, ?> entry)) continue;
            String studentIdValue = entry.get("studentId") == null ? null : String.valueOf(entry.get("studentId"));
            if (studentIdValue == null) continue;
            UUID studentId;
            try {
                studentId = UUID.fromString(studentIdValue);
            } catch (IllegalArgumentException ex) {
                throw ApiException.badRequest("Invalid student in the grade sheet.");
            }
            Student student = students.findById(studentId)
                    .orElseThrow(() -> ApiException.notFound("A student in the grade sheet no longer exists."));
            if (!student.schoolId.equals(assessment.schoolId)) {
                throw ApiException.forbidden("The grade sheet contains a student from another school.");
            }

            Double score = nullableNumber(entry.get("score"));
            if (score == null) continue;
            if (score < 0 || score > assessment.maxScore) {
                throw ApiException.badRequest("Scores must be between 0 and " + assessment.maxScore + ".");
            }

            Grade grade = grades.findByAssessmentIdAndStudentId(id, student.id).orElseGet(Grade::new);
            grade.assessmentId = id;
            grade.studentId = student.id;
            grade.score = score;
            grade.letter = Util.letterFor(score, assessment.maxScore);
            Object commentValue = entry.get("comment");
            grade.comment = commentValue == null ? null : Util.clean(String.valueOf(commentValue));
            grade.postedByUserId = actor.id;
            grade.postedAt = java.time.LocalDateTime.now();
            grades.save(grade);
            saved++;

            if (assessment.published) {
                notified += notifications.notifyGradePublished(assessment, grade, student);
            }
        }

        return map("saved", saved, "notificationsSent", notified,
                "message", saved + " score" + (saved == 1 ? "" : "s") + " saved.");
    }

    @PatchMapping("/assessments/{id}/publish")
    @Transactional
    public Map<String, Object> publish(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        requireGrader(actor);
        Assessment assessment = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment not found."));
        access.requireSchoolAccess(actor, assessment.schoolId);

        boolean publish = body == null || Util.b(body, "published", true);
        assessment.published = publish;
        assessments.save(assessment);

        int notified = 0;
        if (publish) {
            for (Grade grade : grades.findByAssessmentId(id)) {
                Student student = students.findById(grade.studentId).orElse(null);
                if (student != null) notified += notifications.notifyGradePublished(assessment, grade, student);
            }
        }

        return map("message", publish ? "Grades published to students and parents." : "Grades hidden from families.",
                "notificationsSent", notified);
    }

    @DeleteMapping("/assessments/{id}")
    @Transactional
    public Map<String, Object> delete(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        requireGrader(actor);
        Assessment assessment = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment not found."));
        access.requireSchoolAccess(actor, assessment.schoolId);
        if (!AccessService.isAdmin(actor) && !actor.id.equals(assessment.postedByUserId)) {
            throw ApiException.forbidden("Only the teacher who posted this assessment can delete it.");
        }
        grades.deleteByAssessmentId(id);
        assessments.delete(assessment);
        return map("message", "Assessment deleted.");
    }

    @GetMapping("/my")
    public Map<String, Object> my() {
        User actor = AuthContext.require();
        access.requireModule(actor, "grades");
        return myGrades(actor);
    }

    private Map<String, Object> myGrades(User actor) {
        List<Student> children = new ArrayList<>();
        if ("PARENT".equals(actor.role)) {
            for (ParentStudent link : parentStudents.findByParentUserId(actor.id)) {
                students.findById(link.studentId).filter(st -> st.active).ifPresent(children::add);
            }
        } else if ("STUDENT".equals(actor.role)) {
            students.findByUserId(actor.id).ifPresent(children::add);
        } else {
            throw ApiException.forbidden("This view is for students and parents.");
        }

        List<Map<String, Object>> cards = new ArrayList<>();
        for (Student child : children) {
            List<Assessment> published = assessments
                    .findBySchoolIdAndPublishedTrueOrderByAssessmentDateDesc(child.schoolId);
            Map<UUID, Assessment> byId = published.stream().collect(Collectors.toMap(a -> a.id, a -> a));

            List<Map<String, Object>> gradeViews = new ArrayList<>();
            Map<String, double[]> subjectTotals = new LinkedHashMap<>();
            double totalPercent = 0;
            int counted = 0;

            for (Grade grade : grades.findByStudentId(child.id)) {
                Assessment assessment = byId.get(grade.assessmentId);
                if (assessment == null || grade.score == null) continue;
                double percent = round(grade.score * 100.0 / assessment.maxScore, 1);
                gradeViews.add(map(
                        "id", grade.id,
                        "subject", assessment.subject,
                        "title", assessment.title,
                        "type", assessment.type,
                        "score", grade.score,
                        "maxScore", assessment.maxScore,
                        "percent", percent,
                        "letter", grade.letter,
                        "comment", grade.comment,
                        "date", assessment.assessmentDate));
                double[] totals = subjectTotals.computeIfAbsent(assessment.subject, k -> new double[2]);
                totals[0] += percent;
                totals[1] += 1;
                totalPercent += percent;
                counted++;
            }
            gradeViews.sort(Comparator.comparing((Map<String, Object> m) -> (LocalDate) m.get("date"),
                    Comparator.nullsLast(Comparator.naturalOrder())).reversed());

            List<Map<String, Object>> subjectSummary = subjectTotals.entrySet().stream()
                    .map(e -> map("subject", e.getKey(),
                            "average", round(e.getValue()[0] / e.getValue()[1], 1),
                            "count", (int) e.getValue()[1]))
                    .sorted(Comparator.comparing(m -> String.valueOf(m.get("subject"))))
                    .toList();

            cards.add(map(
                    "student", map("id", child.id, "fullName", child.fullName(),
                            "schoolClass", child.schoolClass, "gradeLevel", child.gradeLevel,
                            "admissionNo", child.admissionNo),
                    "average", counted == 0 ? null : round(totalPercent / counted, 1),
                    "subjectSummary", subjectSummary,
                    "grades", gradeViews));
        }

        return map("children", cards);
    }

    private Map<String, Object> assessmentView(Assessment assessment) {
        List<Grade> entries = grades.findByAssessmentId(assessment.id);
        double average = entries.stream().filter(g -> g.score != null)
                .mapToDouble(g -> g.score).average().orElse(0);
        String postedBy = assessment.postedByUserId == null ? null
                : users.findById(assessment.postedByUserId).map(u -> u.fullName).orElse(null);
        return map(
                "id", assessment.id,
                "title", assessment.title,
                "subject", assessment.subject,
                "type", assessment.type,
                "gradeLevel", assessment.gradeLevel,
                "schoolClass", assessment.schoolClass,
                "maxScore", assessment.maxScore,
                "assessmentDate", assessment.assessmentDate,
                "published", assessment.published,
                "postedBy", postedBy,
                "gradedCount", entries.size(),
                "average", entries.isEmpty() ? null : round(average, 1),
                "createdAt", assessment.createdAt);
    }

    private void requireGrader(User actor) {
        if (!List.of("SUPER_ADMIN", "ADMIN", "TEACHER").contains(actor.role)) {
            throw ApiException.forbidden("Only teachers and administrators can post grades.");
        }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return LocalDate.now();
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Enter dates in YYYY-MM-DD format.");
        }
    }

    private double number(Object value, double fallback) {
        if (value == null || String.valueOf(value).isBlank()) return fallback;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("Enter a valid number.");
        }
    }

    private Double nullableNumber(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("Enter a valid score.");
        }
    }
}
