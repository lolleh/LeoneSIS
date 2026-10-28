package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "session_tokens")
public class SessionToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false, unique = true, length = 80)
    public String token;

    @Column(nullable = false)
    public UUID userId;

    @Column(nullable = false)
    public LocalDateTime expiresAt;

    public LocalDateTime createdAt = LocalDateTime.now();
}
