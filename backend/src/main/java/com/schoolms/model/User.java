package com.schoolms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_username", columnNames = "username"),
        @UniqueConstraint(name = "uk_user_email", columnNames = "email")
})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    /** Null only for platform (super) administrators, who can manage every school. */
    public UUID schoolId;

    @Column(nullable = false, length = 60)
    public String username;

    @Column(nullable = false, length = 160)
    public String email;

    @Column(nullable = false)
    public String fullName;

    @JsonIgnore
    @Column(nullable = false)
    public String passwordHash;

    /** SUPER_ADMIN, ADMIN, TEACHER, STAFF, PARENT, STUDENT */
    @Column(nullable = false, length = 20)
    public String role;

    /** Comma separated extra modules granted on top of the role defaults. */
    @Column(length = 500)
    public String privileges = "";

    public boolean active = true;

    public LocalDateTime createdAt = LocalDateTime.now();
    public LocalDateTime lastLoginAt;
}
