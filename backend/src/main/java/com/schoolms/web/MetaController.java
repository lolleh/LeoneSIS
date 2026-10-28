package com.schoolms.web;

import com.schoolms.model.School;
import com.schoolms.model.User;
import com.schoolms.repo.AssessmentRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.AuthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;

@RestController
@RequestMapping("/api/meta")
public class MetaController {
    private final AccessService access;
    private final AuthService auth;
    private final SchoolRepository schools;
    private final StudentRepository students;
    private final AssessmentRepository assessments;

    public MetaController(AccessService access, AuthService auth, SchoolRepository schools,
                          StudentRepository students, AssessmentRepository assessments) {
        this.access = access;
        this.auth = auth;
        this.schools = schools;
        this.students = students;
        this.assessments = assessments;
    }

    @GetMapping
    public Map<String, Object> meta(@RequestParam(required = false) UUID schoolId) {
        User user = AuthContext.require();
        UUID scope = access.resolveSchoolId(user, schoolId);

        List<Map<String, Object>> moduleList = new ArrayList<>();
        AccessService.MODULE_LABELS.forEach((key, label) -> moduleList.add(map("key", key, "label", label)));

        List<Map<String, Object>> schoolViews = new ArrayList<>();
        if (AccessService.isSuperAdmin(user)) {
            for (School school : schools.findAllByOrderByNameAsc()) {
                schoolViews.add(map("id", school.id, "name", school.name, "code", school.code, "active", school.active));
            }
        } else if (user.schoolId != null) {
            schools.findById(user.schoolId).ifPresent(school -> schoolViews.add(
                    map("id", school.id, "name", school.name, "code", school.code, "active", school.active)));
        }

        List<String> modules = access.modulesFor(user);
        if (scope != null) {
            modules = access.modulesForSchool(user, scope);
        }

        Map<String, Object> result = map(
                "user", auth.userView(user),
                "modules", modules,
                "allModules", moduleList,
                "roles", AccessService.ROLES,
                "schools", schoolViews,
                "scopeSchoolId", scope,
                "classes", scope == null ? List.of() : students.findDistinctClasses(scope),
                "gradeLevels", scope == null ? List.of() : students.findDistinctGradeLevels(scope),
                "subjects", scope == null ? List.of() : assessments.findDistinctSubjects(scope));

        if (scope != null) {
            schools.findById(scope).ifPresent(school -> {
                result.put("school", map("id", school.id, "name", school.name, "code", school.code,
                        "enabledModules", school.getEnabledModulesList()));
            });
        } else if (AccessService.isSuperAdmin(user) && schoolViews.size() == 1) {
            // if viewing single school context not specified, try to get from first
        }

        return result;
    }
}
