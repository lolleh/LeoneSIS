package com.schoolms.web;

import com.schoolms.model.User;
import com.schoolms.security.AuthContext;
import com.schoolms.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        return auth.login(body.get("username"), body.get("password"));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            auth.logout(header.substring(7).trim());
        }
        return Util.map("ok", true);
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        User user = AuthContext.require();
        return Util.map("user", auth.userView(user));
    }
}
