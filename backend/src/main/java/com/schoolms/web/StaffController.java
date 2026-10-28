package com.schoolms.web;

import com.schoolms.model.School;
import com.schoolms.model.Staff;
import com.schoolms.model.User;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StaffRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.AuthService;
import com.schoolms.service.NotificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/staff")
public class StaffController {
    private final StaffRepository staff;
    private final UserRepository users;
    private final SchoolRepository schools;
    private final AccessService access;
    private final AuthService auth;
    private final NotificationService notifications;

    public StaffController(StaffRepository staff, UserRepository users, SchoolRepository schools,
                           AccessService access, AuthService auth, NotificationService notifications) {
        this.staff = staff;
        this.users = users;
        this.schools = schools;
        this.access = access;
        this.auth = auth;
        this.notifications = notifications;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) String search) {
        User actor = AuthContext.require();
        access.requireModule(actor, "staff");
        UUID scope = access.resolveSchoolId(actor, schoolId);

        List<Staff> found = scope == null ? staff.findAll() : staff.findBySchoolIdOrderByFirstNameAsc(scope);
        String needle = search == null ? null : search.trim().toLowerCase();
        List<Map<String, Object>> views = found.stream()
                .filter(member -> needle == null || needle.isEmpty()
                        || member.fullName().toLowerCase().contains(needle)
                        || (member.position != null && member.position.toLowerCase().contains(needle))
                        || (member.department != null && member.department.toLowerCase().contains(needle))
                        || member.staffNo.toLowerCase().contains(needle))
                .sorted(Comparator.comparing(Staff::fullName))
                .map(this::view)
                .toList();

        return map("staff", views);
    }

    @PostMapping
    @Transactional
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "staff");
        access.requireManagement(actor);

        UUID schoolId = access.requireSchoolId(actor, Util.uuid(body, "schoolId"));
        School school = schools.findById(schoolId).orElseThrow(() -> ApiException.notFound("School not found."));
        String firstName = s(body, "firstName");
        String lastName = s(body, "lastName");
        if (firstName == null || lastName == null) throw ApiException.badRequest("Staff first and last name are required.");

        Staff member = new Staff();
        member.schoolId = schoolId;
        member.staffNo = uniqueStaffNo(school);
        member.firstName = firstName;
        member.lastName = lastName;
        member.position = s(body, "position");
        member.department = s(body, "department");
        member.email = s(body, "email");
        member.phone = s(body, "phone");
        member.qualification = s(body, "qualification");
        member.hireDate = parseDate(s(body, "hireDate"));
        member.active = true;
        member = staff.save(member);

        if (Util.b(body, "createLogin", false)) {
            String username = s(body, "username");
            String password = s(body, "password");
            String role = s(body, "role");
            if (role == null) role = "TEACHER";
            if (!List.of("TEACHER", "STAFF", "ADMIN").contains(role)) {
                throw ApiException.badRequest("Staff login role must be Teacher, Staff or Administrator.");
            }
            if (username == null) throw ApiException.badRequest("Choose a username for the staff login.");
            if (password == null) throw ApiException.badRequest("Set a password for the staff login.");
            String email = s(body, "loginEmail");
            if (email == null) email = member.email;
            if (email == null) email = username.toLowerCase() + "@staff." + school.code.toLowerCase() + ".school";

            User account = auth.createUser(schoolId, username, email, member.fullName(), password, role,
                    access.normalizePrivileges(Util.stringList(body.get("privileges"))));
            member.userId = account.id;
            staff.save(member);

            notifications.send(schoolId, account.id, "Welcome to " + school.name,
                    "Your staff portal account is ready. You can take attendance, share resources in the library, message families and post grades.",
                    "SYSTEM", "STAFF", member.id.toString());
        }

        return map("staff", view(member), "message", member.fullName() + " added to staff.");
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "staff");
        access.requireManagement(actor);
        Staff member = staff.findById(id).orElseThrow(() -> ApiException.notFound("Staff member not found."));
        access.requireSchoolAccess(actor, member.schoolId);

        if (s(body, "firstName") != null) member.firstName = s(body, "firstName");
        if (s(body, "lastName") != null) member.lastName = s(body, "lastName");
        if (s(body, "position") != null) member.position = s(body, "position");
        if (s(body, "department") != null) member.department = s(body, "department");
        if (s(body, "email") != null) member.email = s(body, "email");
        if (s(body, "phone") != null) member.phone = s(body, "phone");
        if (s(body, "qualification") != null) member.qualification = s(body, "qualification");
        if (s(body, "hireDate") != null) member.hireDate = parseDate(s(body, "hireDate"));
        if (body.containsKey("active")) member.active = Util.b(body, "active", member.active);

        String staffNo = s(body, "staffNo");
        if (staffNo != null && !staffNo.equals(member.staffNo)) {
            if (staff.existsBySchoolIdAndStaffNo(member.schoolId, staffNo)) {
                throw ApiException.conflict("Staff number " + staffNo + " is already in use.");
            }
            member.staffNo = staffNo;
        }
        staff.save(member);
        return map("staff", view(member), "message", "Staff record updated.");
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deactivate(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "staff");
        access.requireManagement(actor);
        Staff member = staff.findById(id).orElseThrow(() -> ApiException.notFound("Staff member not found."));
        access.requireSchoolAccess(actor, member.schoolId);
        member.active = false;
        staff.save(member);
        return map("message", member.fullName() + " marked as inactive.");
    }

    private Map<String, Object> view(Staff member) {
        School school = schools.findById(member.schoolId).orElse(null);
        User account = member.userId == null ? null : users.findById(member.userId).orElse(null);
        return map(
                "id", member.id,
                "schoolId", member.schoolId,
                "schoolName", school == null ? null : school.name,
                "staffNo", member.staffNo,
                "firstName", member.firstName,
                "lastName", member.lastName,
                "fullName", member.fullName(),
                "position", member.position,
                "department", member.department,
                "email", member.email,
                "phone", member.phone,
                "qualification", member.qualification,
                "hireDate", member.hireDate,
                "active", member.active,
                "hasLogin", account != null,
                "account", account == null ? null : map(
                        "id", account.id, "username", account.username, "role", account.role, "active", account.active));
    }

    private String uniqueStaffNo(School school) {
        for (int i = 0; i < 50; i++) {
            String candidate = "STF-" + String.format("%04d", (int) (Math.random() * 9000) + 1000);
            if (!staff.existsBySchoolIdAndStaffNo(school.id, candidate)) return candidate;
        }
        return "STF-" + System.currentTimeMillis();
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest("Enter dates in YYYY-MM-DD format.");
        }
    }
}
