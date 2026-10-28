package com.schoolms.web;

import com.schoolms.model.School;
import com.schoolms.model.User;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.StaffRepository;
import com.schoolms.repo.StudentRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
import com.schoolms.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {
    private static final List<String> ALLOWED_EXTENSIONS = List.of("png", "jpg", "jpeg", "svg", "webp", "gif");
    private final SchoolRepository schools;
    private final UserRepository users;
    private final StudentRepository students;
    private final StaffRepository staff;
    private final AccessService access;
    private final AuthService auth;

    @Value("${app.upload-dir:/data/uploads}")
    private String uploadDir;

    public SchoolController(SchoolRepository schools, UserRepository users, StudentRepository students,
                            StaffRepository staff, AccessService access, AuthService auth) {
        this.schools = schools;
        this.users = users;
        this.students = students;
        this.staff = staff;
        this.access = access;
        this.auth = auth;
    }

    @GetMapping
    public Map<String, Object> list() {
        User user = AuthContext.require();
        access.requireModule(user, "schools");

        List<School> found = AccessService.isSuperAdmin(user)
                ? schools.findAllByOrderByNameAsc()
                : schools.findById(user.schoolId).map(List::of).orElse(List.of());

        List<Map<String, Object>> views = new ArrayList<>();
        for (School school : found) views.add(view(school));
        return map("schools", views);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable UUID id) {
        User user = AuthContext.require();
        access.requireSchoolAccess(user, id);
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        return map("school", view(school));
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        User user = AuthContext.require();
        if (!AccessService.isSuperAdmin(user)) {
            throw ApiException.forbidden("Only platform administrators can create schools.");
        }

        String name = s(body, "name");
        String code = s(body, "code");
        if (name == null) throw ApiException.badRequest("School name is required.");
        if (code == null) throw ApiException.badRequest("School code is required.");
        code = code.toUpperCase().replaceAll("[^A-Z0-9-]", "");
        if (code.length() < 2) throw ApiException.badRequest("School code must have at least 2 letters or numbers.");
        if (schools.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("A school with code " + code + " already exists.");
        }

        School school = new School();
        school.name = name;
        school.code = code;
        school.city = s(body, "city");
        school.address = s(body, "address");
        school.phone = s(body, "phone");
        school.email = s(body, "email");
        school.principal = s(body, "principal");
        school.motto = s(body, "motto");
        school.active = true;
        school.createdAt = LocalDateTime.now();
        if (body.containsKey("enabledModules")) {
            Object em = body.get("enabledModules");
            if (em instanceof List<?> list) {
                java.util.ArrayList<String> mods = new java.util.ArrayList<>();
                for (Object o : list) {
                    if (o != null) {
                        String sMod = o.toString().trim();
                        if ((sMod.equals("fees") || sMod.equals("library")) && !mods.contains(sMod)) {
                            mods.add(sMod);
                        }
                    }
                }
                school.enabledModules = String.join(",", mods);
            } else {
                school.enabledModules = "fees,library";
            }
        } else {
            school.enabledModules = "fees,library";
        }
        school = schools.save(school);

        String adminUsername = s(body, "adminUsername");
        String adminPassword = s(body, "adminPassword");
        if (adminUsername != null) {
            if (adminPassword == null || adminPassword.length() < 6) {
                throw ApiException.badRequest("Give the school administrator a password of at least 6 characters.");
            }
            String adminName = s(body, "adminName");
            String adminEmail = s(body, "adminEmail");
            auth.createUser(school.id, adminUsername, adminEmail == null ? adminUsername + "@" + code.toLowerCase() + ".school"
                            : adminEmail, adminName == null ? school.name + " Administrator" : adminName,
                    adminPassword, "ADMIN", "");
        }

        return map("school", view(school), "message", "School created successfully.");
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        User user = AuthContext.require();
        boolean isPlatformAdmin = AccessService.isSuperAdmin(user);
        boolean isSchoolAdmin = (("ADMIN".equals(user.role) || "SCHOOL_ADMIN".equals(user.role)) && id.equals(user.schoolId))
                || (AccessService.isAdmin(user) && user.schoolId != null && user.schoolId.equals(id));
        if (!isPlatformAdmin && !isSchoolAdmin) {
            throw ApiException.forbidden("You can only edit your own school's profile.");
        }

        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        String name = s(body, "name");
        if (name != null) school.name = name;
        if (isPlatformAdmin) {
            String code = s(body, "code");
            if (code != null && !code.equalsIgnoreCase(school.code)) {
                code = code.toUpperCase().replaceAll("[^A-Z0-9-]", "");
                if (schools.existsByCodeIgnoreCase(code)) {
                    throw ApiException.conflict("A school with code " + code + " already exists.");
                }
                school.code = code;
            }
            if (body.containsKey("active")) school.active = Util.b(body, "active", school.active);
        }
        school.city = s(body, "city") == null ? school.city : s(body, "city");
        school.address = s(body, "address") == null ? school.address : s(body, "address");
        school.phone = s(body, "phone") == null ? school.phone : s(body, "phone");
        school.email = s(body, "email") == null ? school.email : s(body, "email");
        school.principal = s(body, "principal") == null ? school.principal : s(body, "principal");
        school.motto = s(body, "motto") == null ? school.motto : s(body, "motto");
        if (isPlatformAdmin && body.containsKey("enabledModules")) {
            Object em = body.get("enabledModules");
            if (em instanceof List<?> list) {
                java.util.ArrayList<String> mods = new java.util.ArrayList<>();
                for (Object o : list) {
                    if (o != null) {
                        String s = o.toString().trim();
                        if ((s.equals("fees") || s.equals("library")) && !mods.contains(s)) {
                            mods.add(s);
                        }
                    }
                }
                school.enabledModules = String.join(",", mods);
            }
        }
        schools.save(school);

        return map("school", view(school), "message", "School profile updated.");
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deactivate(@PathVariable UUID id) {
        User user = AuthContext.require();
        if (!AccessService.isSuperAdmin(user)) {
            throw ApiException.forbidden("Only platform administrators can deactivate schools.");
        }
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        school.active = false;
        schools.save(school);
        return map("message", school.name + " has been deactivated.");
    }

    private Map<String, Object> view(School school) {
        List<Map<String, Object>> admins = users.findBySchoolIdAndRoleOrderByFullNameAsc(school.id, "ADMIN").stream()
                .map(u -> map("id", u.id, "name", u.fullName, "username", u.username, "email", u.email))
                .toList();
        return map(
                "id", school.id,
                "name", school.name,
                "code", school.code,
                "city", school.city,
                "address", school.address,
                "phone", school.phone,
                "email", school.email,
                "principal", school.principal,
                "motto", school.motto,
                "active", school.active,
                "enabledModules", school.getEnabledModulesList(),
                "createdAt", school.createdAt,
                "logoPath", school.logoPath,
                "badgePath", school.badgePath,
                "logoUrl", school.logoPath == null ? null : "/api/schools/" + school.id + "/logo",
                "badgeUrl", school.badgePath == null ? null : "/api/schools/" + school.id + "/badge",
                "students", students.countBySchoolIdAndActiveTrue(school.id),
                "staff", staff.countBySchoolIdAndActiveTrue(school.id),
                "users", users.countBySchoolId(school.id),
                "admins", admins);
    }

    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadLogo(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        User user = AuthContext.require();
        boolean isPlatformAdmin = AccessService.isSuperAdmin(user);
        boolean isSchoolAdmin = ("ADMIN".equals(user.role) || "SCHOOL_ADMIN".equals(user.role)) && id.equals(user.schoolId);
        if (!isPlatformAdmin && !isSchoolAdmin) {
            throw ApiException.forbidden("You can only edit your own school's profile.");
        }
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a file to upload.");
        String original = file.getOriginalFilename() == null ? "logo" : file.getOriginalFilename();
        if (original.contains("..") || original.contains("/") || original.contains("\\")) {
            throw ApiException.badRequest("Invalid file name.");
        }
        String extension = extensionOf(original);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Upload a PNG, JPG, JPEG, SVG, WebP or GIF image.");
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            throw ApiException.badRequest("File is too large. Maximum size is 5 MB.");
        }
        try {
            Path directory = Path.of(uploadDir);
            Files.createDirectories(directory);
            String storedName = "school-logo-" + id + "-" + UUID.randomUUID() + "." + extension;
            Path destination = directory.resolve(storedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            school.logoPath = destination.toString();
            schools.save(school);
            return map("school", view(school), "message", "School logo uploaded.");
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not store the uploaded file: " + ex.getMessage());
        }
    }

    @PostMapping(value = "/{id}/badge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadBadge(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        User user = AuthContext.require();
        boolean isPlatformAdmin = AccessService.isSuperAdmin(user);
        boolean isSchoolAdmin = ("ADMIN".equals(user.role) || "SCHOOL_ADMIN".equals(user.role)) && id.equals(user.schoolId);
        if (!isPlatformAdmin && !isSchoolAdmin) {
            throw ApiException.forbidden("You can only edit your own school's profile.");
        }
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a file to upload.");
        String original = file.getOriginalFilename() == null ? "badge" : file.getOriginalFilename();
        if (original.contains("..") || original.contains("/") || original.contains("\\")) {
            throw ApiException.badRequest("Invalid file name.");
        }
        String extension = extensionOf(original);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Upload a PNG, JPG, JPEG, SVG, WebP or GIF image.");
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            throw ApiException.badRequest("File is too large. Maximum size is 5 MB.");
        }
        try {
            Path directory = Path.of(uploadDir);
            Files.createDirectories(directory);
            String storedName = "school-badge-" + id + "-" + UUID.randomUUID() + "." + extension;
            Path destination = directory.resolve(storedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            school.badgePath = destination.toString();
            schools.save(school);
            return map("school", view(school), "message", "School badge uploaded.");
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not store the uploaded file: " + ex.getMessage());
        }
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<Resource> logo(@PathVariable UUID id) {
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        Path path = Path.of(school.logoPath == null ? "" : school.logoPath);
        if (!Files.exists(path)) throw ApiException.notFound("Logo not found.");
        Resource resource = new FileSystemResource(path);
        String contentType = contentTypeFor(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    @GetMapping("/{id}/badge")
    public ResponseEntity<Resource> badge(@PathVariable UUID id) {
        School school = schools.findById(id).orElseThrow(() -> ApiException.notFound("School not found."));
        Path path = Path.of(school.badgePath == null ? "" : school.badgePath);
        if (!Files.exists(path)) throw ApiException.notFound("Badge not found.");
        Resource resource = new FileSystemResource(path);
        String contentType = contentTypeFor(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    private String extensionOf(String original) {
        int idx = original.lastIndexOf('.');
        if (idx < 0 || idx == original.length() - 1) return "";
        return original.substring(idx + 1).toLowerCase();
    }

    private String contentTypeFor(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}
