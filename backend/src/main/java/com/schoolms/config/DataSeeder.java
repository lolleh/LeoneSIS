package com.schoolms.config;

import com.schoolms.model.Assessment;
import com.schoolms.model.AttendanceRecord;
import com.schoolms.model.Book;
import com.schoolms.model.FeeTransaction;
import com.schoolms.model.Grade;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.School;
import com.schoolms.model.Staff;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.AssessmentRepository;
import com.schoolms.repo.AttendanceRecordRepository;
import com.schoolms.repo.BookRepository;
import com.schoolms.repo.FeeTransactionRepository;
import com.schoolms.repo.GradeRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StaffRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.service.AuthService;
import com.schoolms.service.MessageService;
import com.schoolms.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class DataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String DEMO_PASSWORD = "password";

    private final UserRepository users;
    private final SchoolRepository schools;
    private final StudentRepository students;
    private final StaffRepository staff;
    private final ParentStudentRepository parentStudents;
    private final AttendanceRecordRepository attendance;
    private final AssessmentRepository assessments;
    private final GradeRepository grades;
    private final BookRepository books;
    private final FeeTransactionRepository feeTransactions;
    private final AuthService auth;
    private final NotificationService notifications;
    private final MessageService messages;

    @Value("${app.seed-demo-data:true}")
    private boolean seedDemoData;

    @Value("${app.upload-dir:/data/uploads}")
    private String uploadDir;

    public DataSeeder(UserRepository users, SchoolRepository schools, StudentRepository students,
                      StaffRepository staff, ParentStudentRepository parentStudents,
                      AttendanceRecordRepository attendance, AssessmentRepository assessments,
                      GradeRepository grades, BookRepository books, FeeTransactionRepository feeTransactions,
                      AuthService auth, NotificationService notifications, MessageService messages) {
        this.users = users;
        this.schools = schools;
        this.students = students;
        this.staff = staff;
        this.parentStudents = parentStudents;
        this.attendance = attendance;
        this.assessments = assessments;
        this.grades = grades;
        this.books = books;
        this.feeTransactions = feeTransactions;
        this.auth = auth;
        this.notifications = notifications;
        this.messages = messages;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensurePlatformAdmin();

        if (!seedDemoData) {
            log.info("Demo data seeding is disabled (APP_SEED_DEMO_DATA=false).");
            return;
        }
        if (schools.findByCodeIgnoreCase("GRN").isPresent()) {
            School existing = schools.findByCodeIgnoreCase("GRN").get();
            seedFeesIfMissing(existing);
            log.info("Demo school already present - skipping demo seed.");
            logCredentials();
            return;
        }

        log.info("Seeding demo school and sample data...");
        try {
            seedDemo();
            log.info("Demo data ready.");
        } catch (Exception ex) {
            log.error("Demo data seeding failed. The application will continue to run.", ex);
        }
        logCredentials();
    }

    private void ensurePlatformAdmin() {
        if (users.findByUsernameIgnoreCase("vlolleh").isPresent()) return;
        auth.createUser(null, "vlolleh", "platform.admin@schoolms.local",
                "Platform Administrator", "password", "SUPER_ADMIN", "");
        log.info("Created platform administrator account: vlolleh / password");
    }

    private void seedDemo() {
        School school = new School();
        school.name = "Greenwood Academy";
        school.code = "GRN";
        school.city = "Freetown";
        school.address = "12 Wilkinson Road, Freetown";
        school.phone = "+232 76 555 010";
        school.email = "office@greenwood.edu";
        school.principal = "Dr. Elizabeth Cole";
        school.motto = "Knowledge, Integrity, Service";
        school.active = true;
        school.createdAt = LocalDateTime.now();
        school = schools.save(school);

        User schoolAdmin = auth.createUser(school.id, "greenwoodadmin", "admin@greenwood.edu",
                "Grace Williams", DEMO_PASSWORD, "ADMIN", "");
        User teacher1 = auth.createUser(school.id, "teacher1", "james.kamara@greenwood.edu",
                "James Kamara", DEMO_PASSWORD, "TEACHER", "");
        User teacher2 = auth.createUser(school.id, "teacher2", "sarah.conteh@greenwood.edu",
                "Sarah Conteh", DEMO_PASSWORD, "TEACHER", "");
        User librarian = auth.createUser(school.id, "librarian", "mary.bangura@greenwood.edu",
                "Mary Bangura", DEMO_PASSWORD, "STAFF", "");

        saveStaff(school.id, teacher1, "STF-2001", "James", "Kamara", "Mathematics Teacher",
                "Sciences", "james.kamara@greenwood.edu", "+232 76 555 011", "BSc Mathematics, PGDE");
        saveStaff(school.id, teacher2, "STF-2002", "Sarah", "Conteh", "English Teacher",
                "Languages", "sarah.conteh@greenwood.edu", "+232 76 555 012", "BA English, PGDE");
        saveStaff(school.id, librarian, "STF-2003", "Mary", "Bangura", "Librarian",
                "Library", "mary.bangura@greenwood.edu", "+232 76 555 013", "Diploma in Library Science");

        User parent1 = createParent(school.id, "parent1", "Aminata Koroma", "amina.koroma@example.com", "+232 77 100 201");
        User parent2 = createParent(school.id, "parent2", "Ibrahim Sesay", "ibrahim.sesay@example.com", "+232 77 100 202");
        User parent3 = createParent(school.id, "parent3", "Isata Bangura", "isata.bangura@example.com", "+232 77 100 203");
        User parent4 = createParent(school.id, "parent4", "Mohamed Conteh", "mohamed.conteh@example.com", "+232 77 100 204");
        User parent5 = createParent(school.id, "parent5", "Mariama Turay", "mariama.turay@example.com", "+232 77 100 205");

        List<Student> studentList = new ArrayList<>();
        studentList.add(createStudent(school, "GRN-1001", "Musa", "Koroma", "Male", "2012-03-14",
                "JSS 2", "JSS 2A", "Aminata Koroma", "amina.koroma@example.com", "+232 77 100 201", parent1));
        studentList.add(createStudent(school, "GRN-1002", "Fatmata", "Sesay", "Female", "2012-07-22",
                "JSS 2", "JSS 2A", "Ibrahim Sesay", "ibrahim.sesay@example.com", "+232 77 100 202", parent2));
        studentList.add(createStudent(school, "GRN-1003", "Ibrahim", "Bangura", "Male", "2011-11-02",
                "JSS 3", "JSS 3A", "Isata Bangura", "isata.bangura@example.com", "+232 77 100 203", parent3));
        studentList.add(createStudent(school, "GRN-1004", "Kadiatu", "Conteh", "Female", "2011-01-19",
                "JSS 3", "JSS 3A", "Mohamed Conteh", "mohamed.conteh@example.com", "+232 77 100 204", parent4));
        studentList.add(createStudent(school, "GRN-1005", "Alpha", "Kamara", "Male", "2013-05-30",
                "JSS 1", "JSS 1A", "Aminata Koroma", "amina.koroma@example.com", "+232 77 100 201", parent1));
        studentList.add(createStudent(school, "GRN-1006", "Aminata", "Turay", "Female", "2013-09-09",
                "JSS 1", "JSS 1A", "Mariama Turay", "mariama.turay@example.com", "+232 77 100 205", parent5));
        studentList.add(createStudent(school, "GRN-1007", "Samuel", "Johnson", "Male", "2012-02-11",
                "JSS 2", "JSS 2A", "Mariama Turay", "mariama.turay@example.com", "+232 77 100 205", parent5));
        studentList.add(createStudent(school, "GRN-1008", "Grace", "Thomas", "Female", "2011-06-05",
                "JSS 3", "JSS 3A", "Mohamed Conteh", "mohamed.conteh@example.com", "+232 77 100 204", parent4));
        studentList.add(createStudent(school, "GRN-1009", "Mariama", "Bangura", "Female", "2008-02-18",
                "SSS 1", "SSS 1A", "Isata Bangura", "isata.bangura@example.com", "+232 77 100 203", parent3));
        studentList.add(createStudent(school, "GRN-1010", "Mohamed", "Sesay", "Male", "2007-10-09",
                "SSS 2", "SSS 2A", "Ibrahim Sesay", "ibrahim.sesay@example.com", "+232 77 100 202", parent2));
        studentList.add(createStudent(school, "GRN-1011", "Hawa", "Koroma", "Female", "2007-04-21",
                "SSS 3", "SSS 3A", "Aminata Koroma", "amina.koroma@example.com", "+232 77 100 201", parent1));
        studentList.add(createStudent(school, "GRN-1012", "Joseph", "Conteh", "Male", "2008-08-30",
                "SSS 1", "SSS 1B", "Mohamed Conteh", "mohamed.conteh@example.com", "+232 77 100 204", parent4));

        // A student portal login for the first learner.
        Student musa = studentList.get(0);
        User studentAccount = auth.createUser(school.id, "student1", "musa.koroma@student.greenwood.edu",
                musa.fullName(), DEMO_PASSWORD, "STUDENT", "");
        musa.userId = studentAccount.id;
        students.save(musa);

        seedAttendance(school, studentList, teacher1);
        seedGrades(school, studentList, teacher1, teacher2);
        seedBooks(school, librarian);
        seedMessages(school, schoolAdmin, teacher1, teacher2, parent1);
        seedFees(school, studentList, schoolAdmin);

        log.info("Demo school: {} (code GRN) with {} students and {} staff",
                school.name, studentList.size(), 3);
    }

    private void seedAttendance(School school, List<Student> studentList, User teacher) {
        LocalDate today = LocalDate.now();
        int dayOffset = 0;
        int seededDays = 0;
        while (seededDays < 8) {
            dayOffset++;
            LocalDate date = today.minusDays(dayOffset);
            if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) continue;

            for (int i = 0; i < studentList.size(); i++) {
                Student student = studentList.get(i);
                String status = "PRESENT";
                String comment = null;
                if ((i + dayOffset) % 13 == 0) {
                    status = "ABSENT";
                    comment = "Parent reported a medical appointment";
                } else if ((i + dayOffset) % 9 == 0) {
                    status = "LATE";
                    comment = "Arrived after assembly";
                }
                saveAttendance(school, student, date, status, comment, teacher);
            }
            seededDays++;
        }

        // Today's register, including two absences that trigger parent alerts.
        for (int i = 0; i < studentList.size(); i++) {
            Student student = studentList.get(i);
            String status = "PRESENT";
            String comment = null;
            if (i == 0) {
                status = "ABSENT";
                comment = "Family emergency reported by guardian";
            } else if (i == 7) {
                status = "ABSENT";
                comment = "Unwell - guardian contacted the office";
            } else if (i == 2) {
                status = "LATE";
                comment = "Transport delay";
            }
            AttendanceRecord record = saveAttendance(school, student, today, status, comment, teacher);
            if ("ABSENT".equals(status)) {
                notifications.notifyAbsence(student, today, teacher.fullName, comment);
            }
        }
    }

    private AttendanceRecord saveAttendance(School school, Student student, LocalDate date, String status,
                                            String comment, User markedBy) {
        AttendanceRecord record = new AttendanceRecord();
        record.schoolId = school.id;
        record.studentId = student.id;
        record.attendanceDate = date;
        record.status = status;
        record.comment = comment;
        record.markedByUserId = markedBy.id;
        return attendance.save(record);
    }

    private void seedGrades(School school, List<Student> studentList, User teacher1, User teacher2) {
        Student musa = studentList.get(0);
        Student fatmata = studentList.get(1);
        Student ibrahim = studentList.get(2);
        Student kadiatu = studentList.get(3);
        Student alpha = studentList.get(4);
        Student aminata = studentList.get(5);
        Student samuel = studentList.get(6);
        Student grace = studentList.get(7);

        Map<Student, Double> algebra = new LinkedHashMap<>();
        algebra.put(musa, 18.0);
        algebra.put(fatmata, 15.0);
        algebra.put(samuel, 12.5);
        seedAssessment(school, teacher1, "Algebra checkpoint quiz", "Mathematics", "QUIZ",
                "JSS 2", "JSS 2A", 20, LocalDate.now().minusDays(9), true, algebra,
                "Strong work on solving linear equations.");

        Map<Student, Double> writing = new LinkedHashMap<>();
        writing.put(musa, 42.0);
        writing.put(fatmata, 47.0);
        writing.put(samuel, 35.0);
        seedAssessment(school, teacher2, "Descriptive writing assignment", "English Language", "ASSIGNMENT",
                "JSS 2", "JSS 2A", 50, LocalDate.now().minusDays(5), true, writing,
                "Focus on vivid sensory detail and paragraph structure.");

        Map<Student, Double> science = new LinkedHashMap<>();
        science.put(ibrahim, 78.0);
        science.put(kadiatu, 86.0);
        science.put(grace, 92.0);
        seedAssessment(school, teacher1, "Mid-term integrated science test", "Integrated Science", "TEST",
                "JSS 3", "JSS 3A", 100, LocalDate.now().minusDays(7), true, science,
                "Revise the human digestive system before the next test.");

        Map<Student, Double> numbers = new LinkedHashMap<>();
        numbers.put(alpha, 17.0);
        numbers.put(aminata, 19.0);
        seedAssessment(school, teacher1, "Number patterns quiz", "Mathematics", "QUIZ",
                "JSS 1", "JSS 1A", 20, LocalDate.now().minusDays(2), false, numbers,
                "Ready to publish after moderation.");
    }

    private void seedAssessment(School school, User postedBy, String title, String subject, String type,
                                String gradeLevel, String schoolClass, double maxScore, LocalDate date,
                                boolean published, Map<Student, Double> scores, String comment) {
        Assessment assessment = new Assessment();
        assessment.schoolId = school.id;
        assessment.title = title;
        assessment.subject = subject;
        assessment.type = type;
        assessment.gradeLevel = gradeLevel;
        assessment.schoolClass = schoolClass;
        assessment.maxScore = maxScore;
        assessment.assessmentDate = date;
        assessment.postedByUserId = postedBy.id;
        assessment.published = published;
        assessment.createdAt = LocalDateTime.now();
        assessment = assessments.save(assessment);

        for (Map.Entry<Student, Double> entry : scores.entrySet()) {
            Grade grade = new Grade();
            grade.assessmentId = assessment.id;
            grade.studentId = entry.getKey().id;
            grade.score = entry.getValue();
            grade.letter = com.schoolms.web.Util.letterFor(entry.getValue(), maxScore);
            grade.comment = comment;
            grade.postedByUserId = postedBy.id;
            grade.postedAt = LocalDateTime.now();
            grades.save(grade);
            if (published) {
                notifications.notifyGradePublished(assessment, grade, entry.getKey());
            }
        }
    }

    private void seedBooks(School school, User librarian) {
        writeBook(school.id, librarian, "The Lion and the Clever Hare",
                "Traditional West African tales", "Storybooks",
                "A short collection of animal folktales retold for young readers.",
                "The Lion and the Clever Hare\n\nLong ago, in the wide savannah, a lion declared himself king of every animal.\n\n"
                        + "The hare listened quietly while the other animals bowed. That evening, he visited the lion's cave with a plan.\n\n"
                        + "\"Great king,\" said the hare, \"there is another lion at the river who says he is stronger than you.\"\n\n"
                        + "The lion roared and followed the hare to a deep well. He leaned over the edge and saw his own reflection.\n\n"
                        + "Thinking it was a rival, he leapt in. The hare walked home slowly, and the animals of the savannah lived in peace.\n\n"
                        + "Moral: cleverness is stronger than size.\n");

        writeBook(school.id, librarian, "Introduction to Algebra",
                "Greenwood Mathematics Department", "Textbooks",
                "A gentle introduction to variables, expressions and linear equations for JSS learners.",
                "Introduction to Algebra\n\nChapter 1 - Variables\n\n"
                        + "Algebra uses letters to stand for numbers we do not yet know. If a basket holds n mangoes and we add 3, we have n + 3 mangoes.\n\n"
                        + "Chapter 2 - Solving equations\n\n"
                        + "An equation is a balance. Whatever we do to one side we must do to the other.\n\n"
                        + "Solve x + 5 = 12 by subtracting 5 from both sides: x = 7.\n\n"
                        + "Chapter 3 - Practice\n\n1. Solve 2x = 18.\n2. Solve x - 4 = 9.\n3. A number doubled and increased by 3 is 15. What is the number?\n");

        writeBook(school.id, librarian, "Sierra Leone: People and Places",
                "Greenwood History Club", "History",
                "Notes on the geography, communities and history of Sierra Leone.",
                "Sierra Leone: People and Places\n\nSierra Leone lies on the west coast of Africa and is home to many languages, including Krio, Mende, Temne, Limba and Loko.\n\n"
                        + "Freetown, the capital, sits on a peninsula of hills and beaches. Bo, Kenema, Makeni and Koidu are other important cities.\n\n"
                        + "The country is known for its diamond deposits, its fishing communities and its strong tradition of storytelling and music.\n\n"
                        + "Independence was achieved on 27 April 1961. Today, Sierra Leoneans continue to build a future rooted in education, community and resilience.\n");
    }

    private void writeBook(UUID schoolId, User librarian, String title, String author, String category,
                           String description, String content) {
        try {
            Path directory = Path.of(uploadDir);
            Files.createDirectories(directory);
            String storedName = UUID.randomUUID() + ".txt";
            Path destination = directory.resolve(storedName);
            Files.writeString(destination, content, StandardCharsets.UTF_8);

            Book book = new Book();
            book.schoolId = schoolId;
            book.title = title;
            book.author = author;
            book.category = category;
            book.description = description;
            book.fileName = title.replaceAll("[^A-Za-z0-9]+", "-") + ".txt";
            book.contentType = "text/plain";
            book.fileSize = content.getBytes(StandardCharsets.UTF_8).length;
            book.storagePath = destination.toString();
            book.uploadedByUserId = librarian.id;
            book.createdAt = LocalDateTime.now();
            books.save(book);
        } catch (IOException ex) {
            log.warn("Could not write sample book '{}': {}", title, ex.getMessage());
        }
    }

    private void seedMessages(School school, User admin, User teacher1, User teacher2, User parent1) {
        messages.send(teacher1, school.id, "Welcome to the Greenwood family portal",
                "Dear parents and guardians,\n\nThis term we are using the portal for attendance alerts, grade updates and messages from teachers. "
                        + "Please check your notifications regularly and reply to your child's form teacher if anything needs attention.\n\n"
                        + "Warm regards,\nJames Kamara",
                "ALL_PARENTS", null, null);

        messages.send(teacher2, school.id, "Musa's reading progress",
                "Dear Mrs Koroma,\n\nMusa has made excellent progress in reading this term. He finished the West African folktale collection early and has started the history notes in the library.\n\n"
                        + "Please encourage him to read for twenty minutes each evening and to write a short summary of what he has read.\n\n"
                        + "Best wishes,\nSarah Conteh",
                "USER", null, List.of(parent1.id));

        messages.send(admin, school.id, "Staff briefing - Friday",
                "Team,\n\nA short briefing will be held in the staff room on Friday after school. We will review attendance follow-up and the new library resources.\n\n"
                        + "Thank you,\nGrace Williams",
                "ALL_STAFF", null, null);
    }

    private User createParent(UUID schoolId, String username, String fullName, String email, String phone) {
        return auth.createUser(schoolId, username, email, fullName, DEMO_PASSWORD, "PARENT", "");
    }

    private Student createStudent(School school, String admissionNo, String firstName, String lastName,
                                  String gender, String dateOfBirth, String gradeLevel, String schoolClass,
                                  String guardianName, String guardianEmail, String guardianPhone, User parent) {
        Student student = new Student();
        student.schoolId = school.id;
        student.admissionNo = admissionNo;
        student.firstName = firstName;
        student.lastName = lastName;
        student.gender = gender;
        student.dateOfBirth = LocalDate.parse(dateOfBirth);
        student.gradeLevel = gradeLevel;
        student.schoolClass = schoolClass;
        student.guardianName = guardianName;
        student.guardianEmail = guardianEmail;
        student.guardianPhone = guardianPhone;
        student.address = "Freetown, Sierra Leone";
        student.enrolledAt = LocalDate.now().minusMonths(2);
        student.active = true;
        student.createdAt = LocalDateTime.now();
        student = students.save(student);

        if (parent != null) {
            ParentStudent link = new ParentStudent();
            link.parentUserId = parent.id;
            link.studentId = student.id;
            parentStudents.save(link);
        }
        return student;
    }

    private void saveStaff(UUID schoolId, User user, String staffNo, String firstName, String lastName,
                           String position, String department, String email, String phone, String qualification) {
        Staff member = new Staff();
        member.schoolId = schoolId;
        member.userId = user.id;
        member.staffNo = staffNo;
        member.firstName = firstName;
        member.lastName = lastName;
        member.position = position;
        member.department = department;
        member.email = email;
        member.phone = phone;
        member.qualification = qualification;
        member.hireDate = LocalDate.now().minusYears(3);
        member.active = true;
        staff.save(member);
    }

    private void seedFeesIfMissing(School school) {
        if (feeTransactions.countBySchoolId(school.id) > 0) return;
        List<Student> studentList = students.findBySchoolIdAndActiveTrueOrderByFirstNameAsc(school.id);
        if (studentList.isEmpty()) return;
        User recorder = users.findByUsernameIgnoreCase("greenwoodadmin").orElse(null);
        seedFees(school, studentList, recorder);
        log.info("Added sample fee charges and payments for {} students.", studentList.size());
    }

    private void seedFees(School school, List<Student> studentList, User recorder) {
        if (feeTransactions.countBySchoolId(school.id) > 0) return;

        LocalDate today = LocalDate.now();
        int academicStart = today.getMonthValue() >= 8 ? today.getYear() : today.getYear() - 1;
        String academicYear = academicStart + "/" + (academicStart + 1);
        String term = academicYear + " · Term " + (today.getMonthValue() >= 8 ? "1" : "3");
        int chargeSequence = 0;
        int paymentSequence = 0;

        for (int i = 0; i < studentList.size(); i++) {
            Student student = studentList.get(i);
            boolean senior = student.gradeLevel != null && student.gradeLevel.startsWith("SSS");
            BigDecimal tuition = BigDecimal.valueOf(senior ? 1650 : 1250).setScale(2, RoundingMode.HALF_UP);
            BigDecimal development = BigDecimal.valueOf(150).setScale(2, RoundingMode.HALF_UP);
            BigDecimal examination = BigDecimal.valueOf(senior ? 180 : 120).setScale(2, RoundingMode.HALF_UP);
            BigDecimal transport = BigDecimal.valueOf(200).setScale(2, RoundingMode.HALF_UP);
            BigDecimal total = tuition.add(development).add(examination);

            chargeSequence = writeSeedFee(school, student, recorder, "CHARGE", "TUITION",
                    "Tuition · " + term, tuition, today.minusDays(42 + (i % 5)),
                    "CHG-" + today.getYear() + "-" + String.format("%04d", ++chargeSequence),
                    null, null, term);
            chargeSequence = writeSeedFee(school, student, recorder, "CHARGE", "DEVELOPMENT",
                    "Development levy", development, today.minusDays(41 + (i % 5)),
                    "CHG-" + today.getYear() + "-" + String.format("%04d", ++chargeSequence),
                    null, null, term);
            chargeSequence = writeSeedFee(school, student, recorder, "CHARGE", "EXAMINATION",
                    "Examination fees", examination, today.minusDays(40 + (i % 5)),
                    "CHG-" + today.getYear() + "-" + String.format("%04d", ++chargeSequence),
                    null, null, term);
            if (i % 3 == 0) {
                total = total.add(transport);
                chargeSequence = writeSeedFee(school, student, recorder, "CHARGE", "TRANSPORT",
                        "School bus · " + term, transport, today.minusDays(39 + (i % 5)),
                        "CHG-" + today.getYear() + "-" + String.format("%04d", ++chargeSequence),
                        null, null, term);
            }

            BigDecimal payment = BigDecimal.ZERO;
            if (i % 6 == 0) {
                payment = total;
            } else if (i % 4 == 0) {
                payment = total.multiply(BigDecimal.valueOf(0.75));
            } else if (i % 3 == 0) {
                payment = total.multiply(BigDecimal.valueOf(0.50));
            } else if (i % 5 == 0) {
                payment = total.multiply(BigDecimal.valueOf(0.30));
            }
            payment = payment.setScale(2, RoundingMode.HALF_UP);
            if (payment.compareTo(BigDecimal.ZERO) > 0) {
                String method = payment.compareTo(total) >= 0 ? "BANK_TRANSFER"
                        : (i % 2 == 0 ? "MOBILE_MONEY" : "CASH");
                writeSeedFee(school, student, recorder, "PAYMENT", "TUITION",
                        payment.compareTo(total) >= 0 ? "School fees · full payment" : "School fees · part payment",
                        payment, today.minusDays(14 + (i % 8)),
                        "RCP-" + today.getYear() + "-" + String.format("%04d", ++paymentSequence),
                        method, "TRX-" + (100000 + i * 37), term);
            }
        }
    }

    private int writeSeedFee(School school, Student student, User recorder, String type,
                             String category, String description, BigDecimal amount, LocalDate date,
                             String reference, String paymentMethod, String paymentReference, String term) {
        FeeTransaction tx = new FeeTransaction();
        tx.schoolId = school.id;
        tx.studentId = student.id;
        tx.type = type;
        tx.category = category;
        tx.description = description;
        tx.amount = amount.setScale(2, RoundingMode.HALF_UP);
        tx.transactionDate = date;
        tx.term = term;
        tx.paymentMethod = paymentMethod;
        tx.paymentReference = paymentReference;
        tx.reference = reference;
        tx.status = "POSTED";
        tx.recordedByUserId = recorder == null ? null : recorder.id;
        tx.createdAt = date.atTime(9 + (Math.abs(reference.hashCode()) % 7), 15);
        feeTransactions.save(tx);
        return reference.endsWith("-0000") ? 0 : Integer.parseInt(reference.substring(reference.length() - 4));
    }

    private void logCredentials() {
        log.info("==========================================================");
        log.info(" LeoneSIS sign-in credentials");
        log.info(" Platform admin : vlolleh / password");
        log.info(" School admin   : greenwoodadmin / password");
        log.info(" Teacher        : teacher1 / password");
        log.info(" Staff/librarian: librarian / password");
        log.info(" Parent         : parent1 / password");
        log.info(" Student        : student1 / password");
        log.info("==========================================================");
    }
}
