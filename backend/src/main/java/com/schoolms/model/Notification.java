package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    public UUID schoolId;

    @Column(nullable = false)
    public UUID userId;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false, length = 2000)
    public String body;

    /** ATTENDANCE, MESSAGE, GRADE, LIBRARY, SYSTEM */
    @Column(nullable = false, length = 30)
    public String type;

    public String referenceType;
    public String referenceId;

    public boolean read = false;
    public LocalDateTime readAt;
    public LocalDateTime createdAt = LocalDateTime.now();
}
