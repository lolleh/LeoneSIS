package com.schoolms.web;

import com.schoolms.model.ParentStudent;
import com.schoolms.model.School;
import com.schoolms.model.Staff;
import com.schoolms.model.Student;
import com.schoolms.model.User;
import com.schoolms.repo.ParentStudentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.SessionTokenRepository;
import com.schoolms.repo.StaffRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.AuthService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;
    private final StudentRepository students;
    private final StaffRepository staff;
    private final ParentStudentRepository parentStudents;
    private final SchoolRepository schools;
    private final SessionTokenRepository tokens;
    private final AccessService access;
    private final AuthService auth;

    public UserController(UserRepository users, StudentRepository students, StaffRepository staff,
                          ParentStudentRepository parentStudents, SchoolRepository schools,
                          SessionTokenRepository tokens, AccessService access, AuthService auth) {
        this.users = users;
        this.students = students;
        this.staff = staff;
        this.parentStudents = parentStudents;
        this.schools = schools;
        this.tokens = tokens;
        this.access = access;
        this.auth = auth;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) String role,
                                    @RequestParam(required = false) String search) {
        User actor = AuthContext.require();
        access.requireModule(actor, "users");
        UUID scope = access.resolveSchoolId(actor, schoolId);

        List<User> found = new ArrayList<>();
        if (scope == null) {
            found.addAll(users.findAll());
        } else {
            found.addAll(users.findBySchoolIdOrderByFullNameAsc(scope));
        }

        String needle = search == null ? null : search.trim().toLowerCase();
        List<Map<String, Object>> views = found.stream()
                .filter(u -> role == null || role.isBlank() || role.equals(u.role))
                .filter(u -> needle == null || needle.isEmpty()
                        || u.fullName.toLowerCase().contains(needle)
                        || u.username.toLowerCase().contains(needle)
                        || u.email.toLowerCase().contains(needle))
                .sorted(Comparator.comparing(u -> u.fullName))
                .map(this::view)
                .toList();

        return map("users", views, "roles", AccessService.ROLES, "allModules", moduleList());
    }

    @PostMapping
    @Transactional
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "users");
        access.requireManagement(actor);

        String role = s(body, "role");
        if (!AccessService.isValidRole(role)) throw ApiException.badRequest("Choose a valid role.");
        if ("SUPER_ADMIN".equals(role) && !AccessService.isSuperAdmin(actor)) {
            throw ApiException.forbidden("Only the platform administrator can create platform administrators.");
        }

        UUID schoolId = access.resolveSchoolId(actor, Util.uuid(body, "schoolId"));
        if ("SUPER_ADMIN".equals(role)) {
            if (!AccessService.isSuperAdmin(actor)) throw ApiException.forbidden("Not allowed.");
            schoolId = null;
        } else if (schoolId == null) {
            throw ApiException.badRequest("Select a school for this account.");
        }

        String privileges = access.normalizePrivileges(Util.stringList(body.get("privileges")));
        User created = auth.createUser(schoolId, s(body, "username"), s(body, "email"), s(body, "fullName"),
                s(body, "password"), role, privileges);

        UUID studentId = Util.uuid(body, "studentId");
        UUID staffId = Util.uuid(body, "staffId");
        if (studentId != null) linkStudent(created, studentId, schoolId);
        if (staffId != null) linkStaff(created, staffId, schoolId);

        List<UUID> childIds = Util.uuidList(body.get("childIds"));
        if (!childIds.isEmpty()) {
            if (!"PARENT".equals(role)) throw ApiException.badRequest("Only parent accounts can be linked to students.");
            setChildren(created, schoolId, childIds);
        }

        return map("user", view(created), "message", "Account created successfully.");
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "users");

        User target = users.findById(id).orElseThrow(() -> ApiException.notFound("Account not found."));
        assertManageable(actor, target);

        boolean self = actor.id.equals(target.id);
        String role = s(body, "role");
        boolean active = Util.b(body, "active", target.active);

        if (self && ((role != null && !role.equals(target.role)) || !active)) {
            throw ApiException.badRequest("You cannot change your own role or deactivate your own account.");
        }
        if (role != null && !role.equals(target.role)) {
            if (!AccessService.isValidRole(role)) throw ApiException.badRequest("Choose a valid role.");
            if ("SUPER_ADMIN".equals(role) && !AccessService.isSuperAdmin(actor)) {
                throw ApiException.forbidden("Only the platform administrator can grant platform administrator access.");
            }
            target.role = role;
        }

        String fullName = s(body, "fullName");
        if (fullName != null) target.fullName = fullName;

        String email = s(body, "email");
        if (email != null && !email.equalsIgnoreCase(target.email)) {
            users.findByEmailIgnoreCase(email).filter(other -> !other.id.equals(target.id)).ifPresent(other -> {
                throw ApiException.conflict("Email \"" + email + "\" is already in use.");
            });
            target.email = email.toLowerCase();
        }

        if (body.containsKey("privileges")) {
            target.privileges = access.normalizePrivileges(Util.stringList(body.get("privileges")));
        }
        target.active = active;
        users.save(target);

        if (!target.active) tokens.deleteByUserId(target.id);

        String password = s(body, "password");
        if (password != null) auth.setPassword(target, password);

        if (body.containsKey("childIds")) {
            if (!"PARENT".equals(target.role)) throw ApiException.badRequest("Only parent accounts can be linked to students.");
            setChildren(target, target.schoolId, Util.uuidList(body.get("childIds")));
        }

        UUID studentId = Util.uuid(body, "studentId");
        if (studentId != null) linkStudent(target, studentId, target.schoolId);
        UUID staffId = Util.uuid(body, "staffId");
        if (staffId != null) linkStaff(target, staffId, target.schoolId);

        return map("user", view(target), "message", "Account updated.");
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Map<String, Object> deactivate(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "users");
        if (actor.id.equals(id)) throw ApiException.badRequest("You cannot deactivate your own account.");

        User target = users.findById(id).orElseThrow(() -> ApiException.notFound("Account not found."));
        assertManageable(actor, target);
        target.active = false;
        users.save(target);
        tokens.deleteByUserId(target.id);
        return map("message", target.fullName + "'s account has been deactivated.");
    }

    @PostMapping("/{id}/reset-password")
    @Transactional
    public Map<String, Object> resetPassword(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User actor = AuthContext.require();
        access.requireModule(actor, "users");
        User target = users.findById(id).orElseThrow(() -> ApiException.notFound("Account not found."));
        assertManageable(actor, target);
        auth.setPassword(target, s(body, "password"));
        tokens.deleteByUserId(target.id);
        return map("message", "Password reset. The user must sign in again.");
    }

    private void assertManageable(User actor, User target) {
        if (!AccessService.isAdmin(actor)) throw ApiException.forbidden("Administrator access is required.");
        if ("SUPER_ADMIN".equals(target.role) && !AccessService.isSuperAdmin(actor)) {
            throw ApiException.forbidden("You cannot manage a platform administrator.");
        }
        if (!AccessService.isSuperAdmin(actor) && !actor.schoolId.equals(target.schoolId)) {
            throw ApiException.forbidden("You cannot manage accounts from another school.");
        }
    }

    private void linkStudent(User user, UUID studentId, UUID schoolId) {
        Student student = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student not found."));
        if (!student.schoolId.equals(schoolId)) throw ApiException.forbidden("That student belongs to another school.");
        if (student.userId != null && !student.userId.equals(user.id)) {
            throw ApiException.conflict("That student already has a portal account.");
        }
        student.userId = user.id;
        students.save(student);
    }

    private void linkStaff(User user, UUID staffId, UUID schoolId) {
        Staff member = staff.findById(staffId).orElseThrow(() -> ApiException.notFound("Staff member not found."));
        if (!member.schoolId.equals(schoolId)) throw ApiException.forbidden("That staff member belongs to another school.");
        if (member.userId != null && !member.userId.equals(user.id)) {
            throw ApiException.conflict("That staff member already has a portal account.");
        }
        member.userId = user.id;
        staff.save(member);
    }

    private void setChildren(User parent, UUID schoolId, List<UUID> childIds) {
        parentStudents.deleteAll(parentStudents.findByParentUserId(parent.id));
        for (UUID childId : childIds) {
            Student student = students.findById(childId).orElseThrow(() -> ApiException.notFound("Student not found."));
            if (schoolId == null || !student.schoolId.equals(schoolId)) {
                throw ApiException.forbidden("That student belongs to another school.");
            }
            if (!parentStudents.existsByParentUserIdAndStudentId(parent.id, childId)) {
                ParentStudent link = new ParentStudent();
                link.parentUserId = parent.id;
                link.studentId = childId;
                parentStudents.save(link);
            }
        }
    }

    private Map<String, Object> view(User user) {
        Map<String, Object> view = auth.userView(user);

        students.findByUserId(user.id).ifPresent(student -> view.put("linkedStudent",
                map("id", student.id, "name", student.fullName(), "schoolClass", student.schoolClass)));

        staff.findByUserId(user.id).ifPresent(member -> view.put("linkedStaff",
                map("id", member.id, "name", member.fullName(), "position", member.position)));

        if ("SUPER_ADMIN".equals(user.role) && user.schoolId == null) {
            view.put("schoolName", "All schools");
        } else if (user.schoolId != null) {
            schools.findById(user.schoolId).ifPresent((School school) -> view.put("schoolName", school.name));
        }

        if ("PARENT".equals(user.role)) {
            List<Map<String, Object>> children = new ArrayList<>();
            for (ParentStudent link : parentStudents.findByParentUserId(user.id)) {
                students.findById(link.studentId).ifPresent(student -> children.add(map(
                        "id", student.id, "name", student.fullName(),
                        "schoolClass", student.schoolClass, "admissionNo", student.admissionNo)));
            }
            view.put("children", children);
        }
        return view;
    }

    private List<Map<String, Object>> moduleList() {
        List<Map<String, Object>> modules = new ArrayList<>();
        AccessService.MODULE_LABELS.forEach((key, label) -> modules.add(map("key", key, "label", label)));
        return modules;
    }
}
