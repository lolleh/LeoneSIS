package com.schoolms.service;

import com.schoolms.model.School;
import com.schoolms.model.User;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.web.ApiException;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AccessService {

    public static final List<String> MODULES = List.of(
            "dashboard", "schools", "users", "students", "staff",
            "attendance", "library", "messages", "grades", "fees", "notifications");

    public static final List<String> TOGGLEABLE_SCHOOL_MODULES = List.of("fees", "library");

    public static final Map<String, String> MODULE_LABELS = new LinkedHashMap<>();

    static {
        MODULE_LABELS.put("dashboard", "Overview");
        MODULE_LABELS.put("schools", "Schools");
        MODULE_LABELS.put("users", "Accounts");
        MODULE_LABELS.put("students", "Students");
        MODULE_LABELS.put("staff", "Staff");
        MODULE_LABELS.put("attendance", "Attendance");
        MODULE_LABELS.put("library", "Library");
        MODULE_LABELS.put("messages", "Messages");
        MODULE_LABELS.put("grades", "Grades");
        MODULE_LABELS.put("fees", "Fees & charges");
        MODULE_LABELS.put("notifications", "Notifications");
    }

    public static final List<String> ROLES = List.of(
            "SUPER_ADMIN", "ADMIN", "TEACHER", "STAFF", "PARENT", "STUDENT");

    private static final Map<String, List<String>> DEFAULTS = new HashMap<>();

    static {
        DEFAULTS.put("SUPER_ADMIN", MODULES);
        DEFAULTS.put("ADMIN", List.of("dashboard", "schools", "users", "students", "staff",
                "attendance", "library", "messages", "grades", "fees", "notifications"));
        DEFAULTS.put("SCHOOL_ADMIN", List.of("dashboard", "schools", "users", "students", "staff",
                "attendance", "library", "messages", "grades", "fees", "notifications"));
        DEFAULTS.put("TEACHER", List.of("dashboard", "students", "attendance", "library",
                "messages", "grades", "notifications"));
        DEFAULTS.put("STAFF", List.of("dashboard", "students", "attendance", "library",
                "messages", "notifications"));
        DEFAULTS.put("PARENT", List.of("dashboard", "attendance", "library", "messages",
                "grades", "fees", "notifications"));
        DEFAULTS.put("STUDENT", List.of("dashboard", "attendance", "library", "messages",
                "grades", "fees", "notifications"));
    }

    private final UserRepository users;
    private final SchoolRepository schools;

    public AccessService(UserRepository users, SchoolRepository schools) {
        this.users = users;
        this.schools = schools;
    }

    public static boolean isValidRole(String role) {
        return role != null && ROLES.contains(role);
    }

    public static boolean isStaffRole(User user) {
        if (user == null || user.role == null) return false;
        return switch (user.role) {
            case "SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "SCHOOL_ADMIN", "TEACHER", "STAFF" -> true;
            default -> false;
        };
    }

    public static boolean isAdmin(User user) {
        if (user == null || user.role == null) return false;
        return "SUPER_ADMIN".equals(user.role) || "PLATFORM_ADMIN".equals(user.role)
                || "ADMIN".equals(user.role) || "SCHOOL_ADMIN".equals(user.role);
    }

    public static boolean isSchoolAdmin(User user) {
        if (user == null || user.role == null) return false;
        return "ADMIN".equals(user.role) || "SCHOOL_ADMIN".equals(user.role);
    }

    public static boolean isSuperAdmin(User user) {
        if (user == null || user.role == null) return false;
        return "SUPER_ADMIN".equals(user.role) || "PLATFORM_ADMIN".equals(user.role);
    }

    public List<String> modulesFor(User user) {
        Set<String> modules = new LinkedHashSet<>(DEFAULTS.getOrDefault(user.role, List.of("dashboard")));
        if (user.privileges != null) {
            for (String part : user.privileges.split(",")) {
                String module = part.trim();
                if (!module.isEmpty() && MODULES.contains(module)) modules.add(module);
            }
        }
        // Filter out toggleable modules if not enabled for the user's school
        if (user.schoolId != null && !isSuperAdmin(user)) {
            schools.findById(user.schoolId).ifPresent(school -> {
                if (school.enabledModules != null && !school.enabledModules.isBlank()) {
                    modules.removeIf(m -> TOGGLEABLE_SCHOOL_MODULES.contains(m) && !school.getEnabledModulesList().contains(m));
                } else {
                    // Default behavior for backward compat - keep enabled
                }
            });
        } else if (user.schoolId == null && !isSuperAdmin(user)) {
            // If not linked to school and not super admin, remove toggleable
        }
        return new ArrayList<>(modules);
    }

    public List<String> modulesForSchool(User user, UUID schoolId) {
        Set<String> modules = new LinkedHashSet<>(DEFAULTS.getOrDefault(user.role, List.of("dashboard")));
        if (user.privileges != null) {
            for (String part : user.privileges.split(",")) {
                String module = part.trim();
                if (!module.isEmpty() && MODULES.contains(module)) modules.add(module);
            }
        }
        if (schoolId != null && !isSuperAdmin(user)) {
            schools.findById(schoolId).ifPresent(school -> {
                if (school.enabledModules != null && !school.enabledModules.isBlank()) {
                    modules.removeIf(m -> TOGGLEABLE_SCHOOL_MODULES.contains(m) && !school.getEnabledModulesList().contains(m));
                }
            });
        }
        return new ArrayList<>(modules);
    }

    public boolean canAccess(User user, String module) {
        return modulesFor(user).contains(module);
    }

    public void requireModule(User user, String module) {
        if (!canAccess(user, module)) {
            throw ApiException.forbidden("Your account does not have access to the " + module + " module.");
        }
    }

    public void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw ApiException.forbidden("Administrator access is required for this action.");
        }
    }

    public void requireSuperAdmin(User user) {
        if (!isSuperAdmin(user)) {
            throw ApiException.forbidden("Only the platform administrator can manage schools.");
        }
    }

    public void requireStaff(User user) {
        if (!isStaffRole(user)) {
            throw ApiException.forbidden("Staff access is required for this action.");
        }
    }

    public void requireManagement(User user) {
        if (!isAdmin(user)) {
            throw ApiException.forbidden("Only administrators can perform this action.");
        }
    }

    /**
     * Finance posting is available to administrators and to staff accounts that
     * have been explicitly granted the fees module by an administrator.
     */
    public static boolean canManageFees(User user) {
        if (isAdmin(user)) return true;
        return ("STAFF".equals(user.role) || "TEACHER".equals(user.role))
                && user.privileges != null
                && Arrays.stream(user.privileges.split(","))
                .map(String::trim)
                .anyMatch("fees"::equals);
    }

    public void requireFeesManagement(User user) {
        if (!canManageFees(user)) {
            throw ApiException.forbidden("Finance access is required to record or void transactions.");
        }
    }

    /**
     * Resolves the school a request operates on. School users are always pinned to
     * their own school; platform admins may target any school or request a
     * platform-wide view (null).
     */
    public UUID resolveSchoolId(User user, UUID requested) {
        if (isSuperAdmin(user)) {
            return requested;
        }
        if (user.schoolId == null) {
            throw ApiException.forbidden("Your account is not linked to a school.");
        }
        if (requested != null && !requested.equals(user.schoolId)) {
            throw ApiException.forbidden("You cannot access another school's data.");
        }
        return user.schoolId;
    }

    public UUID requireSchoolId(User user, UUID requested) {
        UUID schoolId = resolveSchoolId(user, requested);
        if (schoolId == null) {
            throw ApiException.badRequest("Select a school first.");
        }
        return schoolId;
    }

    public void requireSchoolAccess(User user, UUID schoolId) {
        if (isSuperAdmin(user)) return;
        if (schoolId == null || !schoolId.equals(user.schoolId)) {
            throw ApiException.forbidden("You cannot access another school's data.");
        }
    }

    public List<String> privilegesList(User user) {
        if (user.privileges == null || user.privileges.isBlank()) return List.of();
        return Arrays.stream(user.privileges.split(","))
                .map(String::trim)
                .filter(MODULES::contains)
                .distinct()
                .toList();
    }

    public String normalizePrivileges(List<String> privileges) {
        if (privileges == null) return "";
        return privileges.stream()
                .filter(MODULES::contains)
                .distinct()
                .reduce((a, b) -> a + "," + b)
                .orElse("");
    }
}
