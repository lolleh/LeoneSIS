package com.schoolms.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolms.model.SessionToken;
import com.schoolms.model.User;
import com.schoolms.repo.SessionTokenRepository;
import com.schoolms.repo.UserRepository;
import com.schoolms.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Component
public class AuthFilter extends OncePerRequestFilter {
    private final SessionTokenRepository tokens;
    private final UserRepository users;
    private final AuthService auth;
    private final ObjectMapper objectMapper;

    public AuthFilter(SessionTokenRepository tokens, UserRepository users, AuthService auth,
                      ObjectMapper objectMapper) {
        this.tokens = tokens;
        this.users = users;
        this.auth = auth;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        if (path.equals("/api/auth/login") || path.equals("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            unauthorized(response, "Sign in required.");
            return;
        }

        Optional<SessionToken> session = tokens.findByToken(token);
        if (session.isEmpty() || session.get().expiresAt.isBefore(LocalDateTime.now())) {
            if (session.isPresent()) auth.logout(token);
            unauthorized(response, "Your session has expired. Please sign in again.");
            return;
        }

        Optional<User> user = users.findById(session.get().userId);
        if (user.isEmpty() || !user.get().active) {
            unauthorized(response, "This account is no longer active.");
            return;
        }

        AuthContext.set(user.get());
        try {
            chain.doFilter(request, response);
        } finally {
            AuthContext.clear();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        // File downloads are opened in a new tab where custom headers cannot be set.
        return request.getParameter("token");
    }

    private void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of("error", message)));
    }
}
