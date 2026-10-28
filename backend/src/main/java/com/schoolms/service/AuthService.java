package com.schoolms.service;

import com.schoolms.model.School;
import com.schoolms.model.SessionToken;
import com.schoolms.model.User;
import com.schoolms.repo.SchoolRepository;
import com.schoolms.repo.SessionTokenRepository;
import com.schoolms.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.schoolms.web.Util.map;

@Service
public class AuthService {
    private final UserRepository users;
    private final SessionTokenRepository tokens;
    private final SchoolRepository schools;
    private final PasswordEncoder encoder;
    private final AccessService access;

    @Value("${app.session-days:7}")
    private int sessionDays;

    public AuthService(UserRepository users, SessionTokenRepository tokens, SchoolRepository schools,
                       PasswordEncoder encoder, AccessService access) {
        this.users = users;
        this.tokens = tokens;
        this.schools = schools;
        this.encoder = encoder;
        this.access = access;
    }

    @Transactional
    public Map<String, Object> login(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw com.schoolms.web.ApiException.badRequest("Enter your username and password.");
        }
        User user = users.findByUsernameIgnoreCase(username.trim())
                .orElseThrow(() -> com.schoolms.web.ApiException.unauthorized("Invalid username or password."));

        if (!user.active) {
            throw com.schoolms.web.ApiException.forbidden("This account has been deactivated. Contact your administrator.");
        }
        if (!encoder.matches(password, user.passwordHash)) {
            throw com.schoolms.web.ApiException.unauthorized("Invalid username or password.");
        }

        tokens.deleteByExpiresAtBefore(LocalDateTime.now());

        SessionToken session = new SessionToken();
        session.token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        session.userId = user.id;
        session.expiresAt = LocalDateTime.now().plusDays(sessionDays);
        tokens.save(session);

        user.lastLoginAt = LocalDateTime.now();
        users.save(user);

        return map("token", session.token, "user", userView(user));
    }

    @Transactional
    public void logout(String token) {
        if (token != null) tokens.deleteByToken(token);
    }

    public Map<String, Object> userView(User user) {
        Optional<School> school = user.schoolId == null ? Optional.empty() : schools.findById(user.schoolId);
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", user.id);
        view.put("username", user.username);
        view.put("email", user.email);
        view.put("fullName", user.fullName);
        view.put("role", user.role);
        view.put("schoolId", user.schoolId);
        view.put("schoolName", school.map(s -> s.name).orElse("All schools"));
        view.put("privileges", access.privilegesList(user));
        view.put("modules", access.modulesFor(user));
        view.put("active", user.active);
        view.put("lastLoginAt", user.lastLoginAt);
        view.put("createdAt", user.createdAt);
        return view;
    }

    public User createUser(UUID schoolId, String username, String email, String fullName, String password,
                           String role, String privileges) {
        if (username == null || username.isBlank()) throw com.schoolms.web.ApiException.badRequest("Username is required.");
        if (email == null || email.isBlank()) throw com.schoolms.web.ApiException.badRequest("Email is required.");
        if (fullName == null || fullName.isBlank()) throw com.schoolms.web.ApiException.badRequest("Full name is required.");
        if (password == null || password.length() < 6) {
            throw com.schoolms.web.ApiException.badRequest("Password must be at least 6 characters.");
        }
        if (!AccessService.isValidRole(role)) throw com.schoolms.web.ApiException.badRequest("Choose a valid role.");
        if (users.existsByUsernameIgnoreCase(username.trim())) {
            throw com.schoolms.web.ApiException.conflict("Username \"" + username.trim() + "\" is already taken.");
        }
        if (users.existsByEmailIgnoreCase(email.trim())) {
            throw com.schoolms.web.ApiException.conflict("Email \"" + email.trim() + "\" is already in use.");
        }

        User user = new User();
        user.schoolId = schoolId;
        user.username = username.trim();
        user.email = email.trim().toLowerCase();
        user.fullName = fullName.trim();
        user.passwordHash = encoder.encode(password);
        user.role = role;
        user.privileges = privileges == null ? "" : privileges;
        return users.save(user);
    }

    public void setPassword(User user, String password) {
        if (password == null || password.length() < 6) {
            throw com.schoolms.web.ApiException.badRequest("Password must be at least 6 characters.");
        }
        user.passwordHash = encoder.encode(password);
        users.save(user);
    }
}
