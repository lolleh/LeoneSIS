package com.schoolms.web;

import com.schoolms.model.FeeTransaction;
import com.schoolms.model.ParentStudent;
import com.schoolms.model.School;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.FeeTransactionRepository;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

import static com.schoolms.web.Util.b;
import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/fees")
public class FeeController {
    private static final DateTimeFormatter PRETTY_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy");
    private static final List<String> PAYMENT_METHODS = List.of(
            "CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "CHEQUE", "OTHER");

    public static final Map<String, String> CATEGORIES = new LinkedHashMap<>();

    static {
        CATEGORIES.put("TUITION", "Tuition / school fees");
        CATEGORIES.put("DEVELOPMENT", "Development levy");
        CATEGORIES.put("EXAMINATION", "Examination fees");
        CATEGORIES.put("TRANSPORT", "Transport");
        CATEGORIES.put("UNIFORM", "Uniform");
        CATEGORIES.put("BOOKS", "Books & materials");
        CATEGORIES.put("BOARDING", "Boarding");
        CATEGORIES.put("LIBRARY", "Library");
        CATEGORIES.put("OTHER", "Other charge");
    }

    private final FeeTransactionRepository fees;
    private final StudentRepository students;
    private final ParentStudentRepository parentStudents;
    private final UserRepository users;
    private final SchoolRepository schools;
    private final AccessService access;
    private final NotificationService notifications;

    public FeeController(FeeTransactionRepository fees, StudentRepository students,
                         ParentStudentRepository parentStudents, UserRepository users,
                         SchoolRepository schools, AccessService access, NotificationService notifications) {
        this.fees = fees;
        this.students = students;
        this.parentStudents = parentStudents;
        this.users = users;
        this.schools = schools;
        this.access = access;
        this.notifications = notifications;
    }

    private void requireFeesModule(User user, UUID schoolId) {
        if (AccessService.isSuperAdmin(user)) return;
        if (schoolId == null) return;
        schools.findById(schoolId).ifPresent(school -> {
            if (school.enabledModules != null && !school.enabledModules.isBlank()) {
                if (!school.getEnabledModulesList().contains("fees")) {
                    throw ApiException.forbidden("Fees & charges module is not enabled for this school.");
                }
            }
        });
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) UUID studentId,
                                    @RequestParam(required = false) String type,
                                    @RequestParam(required = false) String search,
                                    @RequestParam(required = false) String from,
                                    @RequestParam(required = false) String to) {
        User actor = AuthContext.require();
        access.requireModule(actor, "fees");

        boolean staff = AccessService.isStaffRole(actor);
        UUID scope = staff ? access.resolveSchoolId(actor, schoolId) : actor.schoolId;
        requireFeesModule(actor, scope);
        List<Student> accessibleStudents = accessibleStudents(actor, scope);

        if (studentId != null) {
            Student selectedStudent = students.findById(studentId)
                    .orElseThrow(() -> ApiException.notFound("Student not found."));
            assertCanViewStudent(actor, selectedStudent);
        }

        Map<UUID, Student> studentMap = accessibleStudents.stream()
                .collect(Collectors.toMap(st -> st.id, st -> st, (a, b) -> a));
        List<UUID> studentIds = new ArrayList<>(studentMap.keySet());

        // Load the full scoped ledger so balances remain accurate when the
        // interface filters the visible rows to one student.
        List<FeeTransaction> all = loadTransactions(actor, scope, studentIds, false);
        all.sort(Comparator.comparing((FeeTransaction t) -> t.transactionDate)
                .thenComparing(t -> t.createdAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed());

        Map<UUID, User> recorderMap = new HashMap<>();
        for (FeeTransaction t : all) {
            if (t.recordedByUserId != null && !recorderMap.containsKey(t.recordedByUserId)) {
                users.findById(t.recordedByUserId).ifPresent(u -> recorderMap.put(u.id, u));
            }
        }

        Map<UUID, List<FeeTransaction>> byStudent = all.stream()
                .collect(Collectors.groupingBy(t -> t.studentId));
        Map<UUID, BigDecimal[]> totals = new HashMap<>();
        for (Student student : accessibleStudents) {
            totals.put(student.id, totals(byStudent.getOrDefault(student.id, List.of())));
        }

        String needle = search == null ? null : search.trim().toLowerCase();
        String normalizedType = type == null || type.isBlank() ? null : type.trim().toUpperCase();
        LocalDate fromDate = date(from);
        LocalDate toDate = date(to);

        List<Map<String, Object>> views = all.stream()
                .filter(t -> studentId == null || studentId.equals(t.studentId))
                .filter(t -> normalizedType == null || normalizedType.equals(t.type))
                .filter(t -> fromDate == null || !t.transactionDate.isBefore(fromDate))
                .filter(t -> toDate == null || !t.transactionDate.isAfter(toDate))
                .filter(t -> {
                    if (needle == null || needle.isEmpty()) return true;
                    Student student = studentMap.get(t.studentId);
                    String haystack = (student == null ? "" : student.fullName() + " " + student.admissionNo)
                            + " " + t.description + " " + t.reference + " " + nullSafe(t.term)
                            + " " + nullSafe(t.paymentReference);
                    return haystack.toLowerCase().contains(needle);
                })
                .map(t -> transactionView(t, studentMap.get(t.studentId), recorderMap.get(t.recordedByUserId),
                        totals.getOrDefault(t.studentId, zeroTotals())))
                .toList();

        BigDecimal[] overall = totals(accessibleStudents, all);
        List<Map<String, Object>> studentViews = accessibleStudents.stream()
                .sorted(Comparator.comparing(Student::fullName))
                .map(student -> {
                    BigDecimal[] t = totals.getOrDefault(student.id, zeroTotals());
                    return map(
                            "id", student.id,
                            "fullName", student.fullName(),
                            "admissionNo", student.admissionNo,
                            "schoolClass", student.schoolClass,
                            "gradeLevel", student.gradeLevel,
                            "guardianName", student.guardianName,
                            "charged", t[0],
                            "paid", t[1],
                            "balance", t[0].subtract(t[1])
                    );
                })
                .toList();

        List<Map<String, Object>> categories = CATEGORIES.entrySet().stream()
                .map(e -> map("key", e.getKey(), "label", e.getValue()))
                .toList();
        List<Map<String, Object>> paymentMethods = PAYMENT_METHODS.stream()
                .map(value -> map("key", value, "label", pretty(value)))
                .toList();
        List<String> terms = all.stream()
                .map(t -> t.term)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();

        return map(
                "transactions", views,
                "students", studentViews,
                "summary", map(
                        "charged", overall[0],
                        "paid", overall[1],
                        "outstanding", overall[0].subtract(overall[1]),
                        "transactionCount", all.size(),
                        "paymentCount", all.stream().filter(t -> "PAYMENT".equals(t.type) && "POSTED".equals(t.status)).count(),
                        "chargeCount", all.stream().filter(t -> "CHARGE".equals(t.type) && "POSTED".equals(t.status)).count(),
                        "studentsOwing", studentViews.stream().filter(st -> ((BigDecimal) st.get("balance")).compareTo(BigDecimal.ZERO) > 0).count()
                ),
                "categories", categories,
                "paymentMethods", paymentMethods,
                "terms", terms,
                "canManage", AccessService.canManageFees(actor),
                "isFamily", !staff,
                "selectedStudentId", studentId,
                "currency", "SLE",
                "currencySymbol", "Le"
        );
    }

    @PostMapping
    @Transactional
    public Map<String, Object> record(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "fees");
        access.requireFeesManagement(actor);

        String type = s(body, "type");
        if (!"CHARGE".equals(type) && !"PAYMENT".equals(type)) {
            throw ApiException.badRequest("Choose whether this is a charge or a payment.");
        }

        UUID studentId = Util.uuid(body, "studentId");
        if (studentId == null) throw ApiException.badRequest("Choose a student for this transaction.");
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student not found."));
        access.requireSchoolAccess(actor, student.schoolId);
        if (!student.active) throw ApiException.badRequest("That student is no longer active.");

        String category = s(body, "category");
        if (category == null) category = "TUITION";
        category = category.toUpperCase(Locale.ROOT);
        if (!CATEGORIES.containsKey(category)) {
            throw ApiException.badRequest("Choose a valid fee category.");
        }

        BigDecimal amount = decimal(body.get("amount"));
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw ApiException.badRequest("Enter an amount greater than zero.");
        }
        if (amount.compareTo(new BigDecimal("100000000")) > 0) {
            throw ApiException.badRequest("That amount is too large. Check the figure and try again.");
        }

        LocalDate txDate = date(s(body, "transactionDate"));
        if (txDate == null) txDate = LocalDate.now();

        String paymentMethod = s(body, "paymentMethod");
        if ("PAYMENT".equals(type)) {
            if (paymentMethod == null) paymentMethod = "CASH";
            paymentMethod = paymentMethod.toUpperCase(Locale.ROOT);
            if (!PAYMENT_METHODS.contains(paymentMethod)) {
                throw ApiException.badRequest("Choose a valid payment method.");
            }
        } else {
            paymentMethod = null;
        }

        String description = s(body, "description");
        if (description == null) {
            description = "PAYMENT".equals(type)
                    ? "School fees payment"
                    : CATEGORIES.get(category);
        }

        String reference = nextReference(student.schoolId,
                "PAYMENT".equals(type) ? "RCP" : "CHG", txDate);

        FeeTransaction tx = new FeeTransaction();
        tx.schoolId = student.schoolId;
        tx.studentId = student.id;
        tx.type = type;
        tx.category = category;
        tx.description = description;
        tx.amount = amount;
        tx.transactionDate = txDate;
        tx.term = s(body, "term");
        tx.paymentMethod = paymentMethod;
        tx.paymentReference = s(body, "paymentReference");
        tx.reference = reference;
        tx.notes = s(body, "notes");
        tx.status = "POSTED";
        tx.recordedByUserId = actor.id;
        tx = fees.save(tx);

        notifyFamily(student, tx);

        BigDecimal[] total = totals(fees.findByStudentIdOrderByCreatedAtAsc(student.id));
        return map(
                "transaction", transactionView(tx, student, actor, total),
                "message", ("PAYMENT".equals(type) ? "Payment recorded" : "Charge added")
                        + " · " + reference
        );
    }

    @PostMapping("/{id}/void")
    @Transactional
    public Map<String, Object> voidTransaction(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "fees");
        access.requireFeesManagement(actor);

        FeeTransaction tx = fees.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found."));
        access.requireSchoolAccess(actor, tx.schoolId);
        if ("VOID".equals(tx.status)) {
            throw ApiException.badRequest("That transaction has already been voided.");
        }
        String reason = body == null ? null : s(body, "reason");
        if (reason == null) reason = "Voided by " + actor.fullName;
        tx.status = "VOID";
        tx.voidReason = reason;
        tx.voidedByUserId = actor.id;
        tx.voidedAt = LocalDateTime.now();
        fees.save(tx);

        return map("message", "Transaction " + tx.reference + " was voided. The ledger balance has been updated.");
    }

    @GetMapping(value = "/{id}/receipt", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> receipt(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "fees");
        FeeTransaction tx = fees.findById(id).orElseThrow(() -> ApiException.notFound("Receipt not found."));
        Student student = students.findById(tx.studentId).orElseThrow(() -> ApiException.notFound("Student not found."));
        assertCanViewStudent(actor, student);
        School school = schools.findById(tx.schoolId).orElse(null);
        User recorder = tx.recordedByUserId == null ? null : users.findById(tx.recordedByUserId).orElse(null);
        BigDecimal[] total = totals(fees.findByStudentIdOrderByCreatedAtAsc(student.id));
        BigDecimal balance = total[0].subtract(total[1]);

        String title = "PAYMENT".equals(tx.type) ? "Payment receipt" : "Fee charge notice";
        String guardian = student.guardianName == null || student.guardianName.isBlank()
                ? "Parent / guardian" : student.guardianName;
        String paymentLabel = tx.paymentMethod == null
                ? ("PAYMENT".equals(tx.type) ? "Payment" : "Charge")
                : pretty(tx.paymentMethod);
        String statusNote = "";
        if ("VOID".equals(tx.status)) {
            String reason = tx.voidReason == null || tx.voidReason.isBlank()
                    ? "No reason was recorded."
                    : escape(tx.voidReason);
            String voidedAt = tx.voidedAt == null ? ""
                    : " Voided " + tx.voidedAt.format(DateTimeFormatter.ofPattern("d MMMM yyyy 'at' HH:mm")) + ".";
            statusNote = "<div class=\"void\">VOIDED</div><p class=\"void-note\">"
                    + "This transaction has been voided and is shown for audit purposes only. "
                    + "Reason: <b>" + reason + "</b>." + voidedAt + "</p>";
        }

        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>%s · %s</title>
                  <style>
                    :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#4f46e5; }
                    * { box-sizing:border-box; }
                    body { margin:0; background:#eef2f7; color:var(--ink); font-family:"Segoe UI",system-ui,-apple-system,sans-serif; font-size:14px; line-height:1.5; }
                    .wrap { max-width:760px; margin:28px auto; padding:0 18px 36px; }
                    .toolbar { display:flex; justify-content:flex-end; gap:10px; margin-bottom:14px; }
                    .toolbar button, .toolbar a { border:1px solid #cbd5e1; background:#fff; color:#334155; border-radius:9px; padding:9px 15px; font-weight:600; font-size:13px; cursor:pointer; text-decoration:none; }
                    .toolbar .primary { background:#0f172a; border-color:#0f172a; color:#fff; }
                    .receipt { background:#fff; border:1px solid #dbe3ee; border-radius:16px; overflow:hidden; box-shadow:0 24px 60px -34px rgba(15,23,42,.35); position:relative; }
                    .head { padding:30px 34px 24px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:22px; align-items:flex-start; }
                    .brand { display:flex; gap:14px; align-items:center; }
                    .brand img { width:58px; height:58px; object-fit:contain; }
                    .brand-name { font-size:24px; font-weight:800; letter-spacing:-.7px; color:#1e3a8a; }
                    .brand-sub { color:var(--muted); font-size:11px; letter-spacing:1.15px; text-transform:uppercase; font-weight:700; margin-top:2px; }
                    .receipt-title { text-align:right; }
                    .receipt-title h1 { margin:0; font-size:19px; letter-spacing:-.3px; }
                    .receipt-title .ref { margin-top:3px; color:var(--muted); font-size:12px; font-weight:600; }
                    .status { display:inline-flex; margin-top:10px; border-radius:999px; padding:4px 10px; font-size:10px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; background:#ecfdf5; color:#047857; }
                    .status.voided { background:#fef2f2; color:#b91c1c; }
                    .body { padding:28px 34px 12px; }
                    .school { display:flex; justify-content:space-between; gap:20px; margin-bottom:26px; }
                    .school h2 { font-size:15px; margin:0 0 4px; }
                    .school p { margin:0; color:var(--muted); font-size:12px; }
                    .meta { text-align:right; font-size:12px; color:var(--muted); }
                    .meta b { color:var(--ink); }
                    .for { display:grid; grid-template-columns:1fr 1fr; gap:18px; padding:16px 18px; border:1px solid var(--line); border-radius:12px; background:#f8fafc; margin-bottom:22px; }
                    .for .k { color:var(--muted); font-size:10px; font-weight:800; letter-spacing:.9px; text-transform:uppercase; }
                    .for .v { font-weight:700; margin-top:2px; }
                    .for .v small { display:block; color:var(--muted); font-weight:500; margin-top:1px; }
                    table { width:100%%; border-collapse:collapse; }
                    th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.9px; color:var(--muted); padding:10px 0; border-bottom:1px solid var(--line); }
                    th.right, td.right { text-align:right; }
                    td { padding:14px 0; border-bottom:1px solid #eef1f7; vertical-align:top; font-size:13px; }
                    td .small { color:var(--muted); font-size:11px; margin-top:2px; }
                    .amount { font-size:18px; font-weight:800; letter-spacing:-.3px; }
                    .totals { margin-left:auto; width:300px; margin-top:8px; }
                    .trow { display:flex; justify-content:space-between; gap:15px; padding:7px 0; color:var(--muted); font-size:12.5px; }
                    .trow b { color:var(--ink); }
                    .trow.grand { border-top:1px solid var(--line); margin-top:6px; padding-top:13px; color:var(--ink); font-weight:800; font-size:16px; }
                    .note { margin-top:26px; padding-top:18px; border-top:1px dashed var(--line); color:var(--muted); font-size:11.5px; }
                    .sign { display:flex; gap:40px; margin-top:26px; }
                    .sign div { flex:1; border-top:1px solid #94a3b8; padding-top:6px; color:var(--muted); font-size:10.5px; }
                    .foot { padding:14px 34px; border-top:1px solid var(--line); background:#f8fafc; color:var(--muted); font-size:10.5px; display:flex; justify-content:space-between; gap:12px; }
                    .void { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:72px; font-weight:900; color:rgba(185,28,28,.14); transform:rotate(-18deg); letter-spacing:8px; pointer-events:none; }
                    .void-note { color:#b91c1c; font-size:12px; margin-top:16px; }
                    .void-note b { color:#991b1b; }
                    @media print { body { background:#fff; } .wrap { margin:0; padding:0; max-width:none; } .toolbar { display:none; } .receipt { border:none; box-shadow:none; border-radius:0; } }
                    @media (max-width:620px) { .head,.body { padding-left:20px; padding-right:20px; } .head,.school { flex-direction:column; } .receipt-title,.meta { text-align:left; } .for { grid-template-columns:1fr; } .totals { width:100%%; } .sign { flex-direction:column; gap:18px; } }
                  </style>
                </head>
                <body>
                  <div class="wrap">
                    <div class="toolbar">
                      <a href="/fees.html">Back to fees</a>
                      <button class="primary" onclick="window.print()">Print receipt</button>
                    </div>
                    <div class="receipt">
                      %s
                      <div class="head">
                        <div class="brand">
                          <img src="/logo-mark.png" alt="LeoneSIS">
                          <div><div class="brand-name">LeoneSIS</div><div class="brand-sub">Every Student · Every School</div></div>
                        </div>
                        <div class="receipt-title">
                          <h1>%s</h1>
                          <div class="ref">%s</div>
                          <span class="status %s">%s</span>
                        </div>
                      </div>
                      <div class="body">
                        <div class="school">
                          <div><h2>%s</h2><p>%s</p><p>%s</p><p>%s</p></div>
                          <div class="meta">Issued <b>%s</b><br>Transaction date <b>%s</b></div>
                        </div>
                        <div class="for">
                          <div><div class="k">Student</div><div class="v">%s<small>%s · %s</small></div></div>
                          <div><div class="k">Billed to</div><div class="v">%s<small>%s</small></div></div>
                          <div><div class="k">Fee category</div><div class="v">%s<small>%s</small></div></div>
                          <div><div class="k">Term / period</div><div class="v">%s<small>%s</small></div></div>
                        </div>
                        <table>
                          <thead><tr><th>Description</th><th>Reference</th><th class="right">Amount</th></tr></thead>
                          <tbody><tr>
                            <td>%s<div class="small">%s</div></td>
                            <td>%s<div class="small">%s</div></td>
                            <td class="right amount">Le %s</td>
                          </tr></tbody>
                        </table>
                        <div class="totals">
                          <div class="trow"><span>Total charged to date</span><b>Le %s</b></div>
                          <div class="trow"><span>Total paid to date</span><b>Le %s</b></div>
                          <div class="trow grand"><span>Outstanding balance</span><span>Le %s</span></div>
                        </div>
                        <div class="note">%s</div>
                        <div class="sign"><div>Received by · %s</div><div>Authorised signature</div></div>
                      </div>
                      <div class="foot">
                        <span>%s · %s</span>
                        <span>Generated electronically by LeoneSIS on %s</span>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                escape(title),
                escape(tx.reference),
                statusNote,
                escape(title),
                escape(tx.reference),
                "VOID".equals(tx.status) ? "voided" : "",
                escape(tx.status),
                escape(school == null ? "School" : school.name),
                escape(school == null ? "" : nullSafe(school.address) + (school.city == null ? "" : ", " + school.city)),
                escape(school == null ? "" : nullSafe(school.phone)),
                escape(school == null ? "" : nullSafe(school.email)),
                LocalDate.now().format(PRETTY_DATE),
                tx.transactionDate.format(PRETTY_DATE),
                escape(student.fullName()),
                escape(nullSafe(student.admissionNo)),
                escape(nullSafe(student.schoolClass)),
                escape(guardian),
                escape(nullSafe(student.guardianEmail)),
                escape(CATEGORIES.getOrDefault(tx.category, tx.category)),
                escape(nullSafe(tx.description)),
                escape(nullSafe(tx.term)),
                escape(paymentLabel),
                escape(nullSafe(tx.description)),
                escape(nullSafe(tx.notes)),
                escape(tx.reference),
                escape(tx.paymentReference == null ? "—" : tx.paymentReference),
                money(tx.amount),
                money(total[0]),
                money(total[1]),
                money(balance),
                escape("PAYMENT".equals(tx.type)
                        ? "Thank you. This receipt confirms the payment shown above. Please keep it for your records."
                        : "This is a charge notice. Please contact the school office if you have any questions."),
                escape(recorder == null ? "School office" : recorder.fullName),
                escape(school == null ? "School" : school.name),
                escape(school == null ? "" : nullSafe(school.code)),
                LocalDate.now().format(PRETTY_DATE)
        );

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header("Cache-Control", "no-store")
                .body(html);
    }

    private List<Student> accessibleStudents(User actor, UUID scope) {
        if (AccessService.isStaffRole(actor)) {
            if (scope == null) return students.findAll();
            return students.findBySchoolIdAndActiveTrueOrderByFirstNameAsc(scope);
        }
        if ("PARENT".equals(actor.role)) {
            List<Student> children = new ArrayList<>();
            for (ParentStudent link : parentStudents.findByParentUserId(actor.id)) {
                students.findById(link.studentId).filter(st -> st.active).ifPresent(children::add);
            }
            return children;
        }
        if ("STUDENT".equals(actor.role)) {
            return students.findByUserId(actor.id).stream().filter(st -> st.active).toList();
        }
        return List.of();
    }

    private List<FeeTransaction> loadTransactions(User actor, UUID scope, List<UUID> studentIds, boolean oneStudent) {
        if (AccessService.isStaffRole(actor)) {
            if (scope == null) return new ArrayList<>(fees.findAllByOrderByTransactionDateDescCreatedAtDesc());
            if (oneStudent && !studentIds.isEmpty()) {
                return new ArrayList<>(fees.findBySchoolIdAndStudentIdOrderByTransactionDateDescCreatedAtDesc(scope, studentIds.get(0)));
            }
            return new ArrayList<>(fees.findBySchoolIdOrderByTransactionDateDescCreatedAtDesc(scope));
        }
        if (studentIds.isEmpty()) return new ArrayList<>();
        return new ArrayList<>(fees.findByStudentIdInOrderByTransactionDateDescCreatedAtDesc(studentIds));
    }

    private void assertCanViewStudent(User actor, Student student) {
        if (AccessService.isStaffRole(actor)) {
            access.requireSchoolAccess(actor, student.schoolId);
            return;
        }
        if ("PARENT".equals(actor.role) && parentStudents.existsByParentUserIdAndStudentId(actor.id, student.id)) {
            return;
        }
        if ("STUDENT".equals(actor.role) && actor.id.equals(student.userId)) {
            return;
        }
        throw ApiException.forbidden("You cannot view this student's fees.");
    }

    private Map<String, Object> transactionView(FeeTransaction tx, Student student, User recorder, BigDecimal[] total) {
        String categoryLabel = CATEGORIES.getOrDefault(tx.category, tx.category);
        return map(
                "id", tx.id,
                "schoolId", tx.schoolId,
                "studentId", tx.studentId,
                "studentName", student == null ? "Unknown student" : student.fullName(),
                "admissionNo", student == null ? null : student.admissionNo,
                "schoolClass", student == null ? null : student.schoolClass,
                "gradeLevel", student == null ? null : student.gradeLevel,
                "type", tx.type,
                "category", tx.category,
                "categoryLabel", categoryLabel,
                "description", tx.description,
                "amount", tx.amount,
                "transactionDate", tx.transactionDate,
                "term", tx.term,
                "paymentMethod", tx.paymentMethod,
                "paymentMethodLabel", tx.paymentMethod == null ? null : pretty(tx.paymentMethod),
                "paymentReference", tx.paymentReference,
                "reference", tx.reference,
                "notes", tx.notes,
                "status", tx.status,
                "voidReason", tx.voidReason,
                "voidedAt", tx.voidedAt,
                "recordedBy", recorder == null ? null : recorder.fullName,
                "createdAt", tx.createdAt,
                "studentBalance", total[0].subtract(total[1])
        );
    }

    private BigDecimal[] totals(List<FeeTransaction> transactions) {
        BigDecimal charged = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        for (FeeTransaction t : transactions) {
            if (!"POSTED".equals(t.status)) continue;
            if ("CHARGE".equals(t.type)) charged = charged.add(t.amount);
            else if ("PAYMENT".equals(t.type)) paid = paid.add(t.amount);
        }
        return new BigDecimal[]{charged, paid};
    }

    private BigDecimal[] totals(List<Student> students, List<FeeTransaction> transactions) {
        Map<UUID, List<FeeTransaction>> byStudent = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.studentId));
        BigDecimal charged = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        for (Student student : students) {
            BigDecimal[] t = totals(byStudent.getOrDefault(student.id, List.of()));
            charged = charged.add(t[0]);
            paid = paid.add(t[1]);
        }
        return new BigDecimal[]{charged, paid};
    }

    private BigDecimal[] zeroTotals() {
        return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
    }

    private String nextReference(UUID schoolId, String prefix, LocalDate date) {
        int year = date.getYear();
        for (int i = 1; i < 10000; i++) {
            String reference = prefix + "-" + year + "-" + String.format("%04d", i);
            if (!fees.existsBySchoolIdAndReference(schoolId, reference)) return reference;
        }
        return prefix + "-" + year + "-" + System.currentTimeMillis();
    }

    private void notifyFamily(Student student, FeeTransaction tx) {
        String amount = "Le " + money(tx.amount);
        String title = "PAYMENT".equals(tx.type) ? "Payment received · " + tx.reference : "New school charge · " + tx.reference;
        String body = ("PAYMENT".equals(tx.type)
                ? amount + " has been received for " + student.fullName() + " (" + nullSafe(student.schoolClass) + "). "
                : "A charge of " + amount + " has been added for " + student.fullName() + " (" + nullSafe(student.schoolClass) + "). ")
                + CATEGORIES.getOrDefault(tx.category, tx.category)
                + (tx.term == null ? "" : " · " + tx.term)
                + ". Open Fees & charges to view the ledger and download the receipt.";
        for (User recipient : notifications.guardiansAndStudent(student)) {
            notifications.send(student.schoolId, recipient.id, title, body, "FEE", "FEE", tx.id.toString());
        }
    }

    private BigDecimal decimal(Object value) {
        if (value == null) return null;
        try {
            return new BigDecimal(String.valueOf(value).replace(",", "").trim()).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            throw ApiException.badRequest("Enter a valid amount.");
        }
    }

    private LocalDate date(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Enter dates in YYYY-MM-DD format.");
        }
    }

    private String money(BigDecimal value) {
        return String.format("%,.2f", value == null ? BigDecimal.ZERO : value);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String pretty(String value) {
        if (value == null) return "";
        String[] parts = value.toLowerCase(Locale.ROOT).split("_");
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (out.length() > 0) out.append(' ');
            out.append(Character.toUpperCase(part.charAt(0))).append(part.substring(1));
        }
        return out.toString();
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
