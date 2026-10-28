package com.schoolms.web;

import com.schoolms.model.Book;
import com.schoolms.model.School;
import com.schoolms.model.User;
import com.schoolms.repo.BookRepository;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AccessService;
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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static com.schoolms.web.Util.map;
import static com.schoolms.web.Util.s;

@RestController
@RequestMapping("/api/library")
public class LibraryController {
    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "txt", "md", "epub");

    private final BookRepository books;
    private final SchoolRepository schools;
    private final UserRepository users;
    private final AccessService access;

    @Value("${app.upload-dir:/data/uploads}")
    private String uploadDir;

    public LibraryController(BookRepository books, SchoolRepository schools, UserRepository users, AccessService access) {
        this.books = books;
        this.schools = schools;
        this.users = users;
        this.access = access;
    }

    private void requireLibraryModule(User user, UUID schoolId) {
        if (AccessService.isSuperAdmin(user)) return;
        if (schoolId == null) return;
        schools.findById(schoolId).ifPresent(school -> {
            if (school.enabledModules != null && !school.enabledModules.isBlank()) {
                if (!school.getEnabledModulesList().contains("library")) {
                    throw ApiException.forbidden("Library module is not enabled for this school.");
                }
            }
        });
    }

    @GetMapping("/books")
    public Map<String, Object> list(@RequestParam(required = false) UUID schoolId,
                                    @RequestParam(required = false) String search,
                                    @RequestParam(required = false) String category) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        UUID scope = access.resolveSchoolId(actor, schoolId);
        requireLibraryModule(actor, scope);

        List<Book> found = scope == null ? books.findBySchoolIdIsNullOrderByCreatedAtDesc()
                : books.findBySchoolIdIsNullOrSchoolIdOrderByCreatedAtDesc(scope);

        String needle = search == null ? null : search.trim().toLowerCase();
        List<Map<String, Object>> views = new ArrayList<>();
        for (Book book : found) {
            if (category != null && !category.isBlank() && !category.equalsIgnoreCase(book.category)) continue;
            if (needle != null && !needle.isEmpty()
                    && !book.title.toLowerCase().contains(needle)
                    && (book.author == null || !book.author.toLowerCase().contains(needle))
                    && (book.description == null || !book.description.toLowerCase().contains(needle))) continue;
            views.add(view(book, actor));
        }

        return map("books", views, "canUpload",
                AccessService.isStaffRole(actor) && access.canAccess(actor, "library"));
    }

    @PostMapping(value = "/books", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam Map<String, String> fields) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        if (!AccessService.isStaffRole(actor)) {
            throw ApiException.forbidden("Only staff can upload library resources.");
        }

        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a file to upload.");
        String original = file.getOriginalFilename() == null ? "resource" : file.getOriginalFilename();
        if (original.contains("..") || original.contains("/") || original.contains("\\")) {
            throw ApiException.badRequest("Invalid file name.");
        }
        String extension = extensionOf(original);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Upload a PDF, EPUB, plain text or Markdown file.");
        }
        if (file.getSize() > 25L * 1024 * 1024) {
            throw ApiException.badRequest("File is too large. Maximum size is 25 MB.");
        }

        String title = fields.get("title");
        if (title == null || title.isBlank()) title = original;
        UUID requestedSchool = parseUuid(fields.get("schoolId"));
        UUID scope = access.resolveSchoolId(actor, requestedSchool);

        try {
            Path directory = Path.of(uploadDir);
            Files.createDirectories(directory);
            String storedName = UUID.randomUUID() + "." + extension;
            Path destination = directory.resolve(storedName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            Book book = new Book();
            book.schoolId = scope;
            book.title = title.trim();
            book.author = clean(fields.get("author"));
            book.category = clean(fields.get("category"));
            book.description = clean(fields.get("description"));
            book.fileName = original;
            book.contentType = file.getContentType();
            book.fileSize = file.getSize();
            book.storagePath = destination.toString();
            book.uploadedByUserId = actor.id;
            book.createdAt = LocalDateTime.now();
            books.save(book);

            return map("book", view(book, actor), "message", "Resource added to the library.");
        } catch (IOException ex) {
            throw ApiException.badRequest("Could not store the uploaded file: " + ex.getMessage());
        }
    }

    @GetMapping("/books/{id}")
    public Map<String, Object> detail(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        Book book = books.findById(id).orElseThrow(() -> ApiException.notFound("Resource not found."));
        assertAccess(actor, book);
        return map("book", view(book, actor));
    }

    @GetMapping("/books/{id}/file")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        Book book = books.findById(id).orElseThrow(() -> ApiException.notFound("Resource not found."));
        assertAccess(actor, book);

        Path path = Path.of(book.storagePath == null ? "" : book.storagePath);
        if (!Files.exists(path)) throw ApiException.notFound("The stored file is missing.");
        Resource resource = new FileSystemResource(path);
        String contentType = book.contentType == null ? "application/octet-stream" : book.contentType;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + book.fileName.replace("\"", "") + "\"")
                .body(resource);
    }

    @GetMapping("/books/{id}/content")
    public Map<String, Object> content(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        Book book = books.findById(id).orElseThrow(() -> ApiException.notFound("Resource not found."));
        assertAccess(actor, book);
        String extension = extensionOf(book.fileName);
        if (!List.of("txt", "md").contains(extension)) {
            throw ApiException.badRequest("This resource is not a text document.");
        }
        try {
            String text = Files.readString(Path.of(book.storagePath), StandardCharsets.UTF_8);
            return map("content", text, "title", book.title);
        } catch (IOException ex) {
            throw ApiException.notFound("The stored file could not be read.");
        }
    }

    @DeleteMapping("/books/{id}")
    @Transactional
    public Map<String, Object> delete(@PathVariable UUID id) {
        User actor = AuthContext.require();
        access.requireModule(actor, "library");
        Book book = books.findById(id).orElseThrow(() -> ApiException.notFound("Resource not found."));
        assertAccess(actor, book);
        boolean uploader = actor.id.equals(book.uploadedByUserId);
        if (!uploader && !AccessService.isAdmin(actor)) {
            throw ApiException.forbidden("Only the uploader or an administrator can remove this resource.");
        }
        try {
            if (book.storagePath != null) Files.deleteIfExists(Path.of(book.storagePath));
        } catch (IOException ignored) {
        }
        books.delete(book);
        return map("message", "Resource removed from the library.");
    }

    private void assertAccess(User actor, Book book) {
        if (AccessService.isSuperAdmin(actor)) return;
        if (book.schoolId == null) return;
        access.requireSchoolAccess(actor, book.schoolId);
    }

    private Map<String, Object> view(Book book, User actor) {
        School school = book.schoolId == null ? null : schools.findById(book.schoolId).orElse(null);
        String uploader = book.uploadedByUserId == null ? null
                : users.findById(book.uploadedByUserId).map(u -> u.fullName).orElse(null);
        String extension = extensionOf(book.fileName);
        return map(
                "id", book.id,
                "schoolId", book.schoolId,
                "schoolName", school == null ? "All schools" : school.name,
                "title", book.title,
                "author", book.author,
                "category", book.category,
                "description", book.description,
                "fileName", book.fileName,
                "contentType", book.contentType,
                "fileSize", book.fileSize,
                "extension", extension,
                "isText", List.of("txt", "md").contains(extension),
                "uploaderName", uploader,
                "uploadedByMe", book.uploadedByUserId != null && book.uploadedByUserId.equals(actor.id),
                "createdAt", book.createdAt);
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return dot < 0 ? "" : fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        return Util.clean(value);
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Invalid school identifier.");
        }
    }
}
