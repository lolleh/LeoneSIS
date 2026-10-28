package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public UUID schoolId;

    @Column(nullable = false)
    public UUID senderUserId;

    @Column(nullable = false)
    public String subject;

    @Column(nullable = false, length = 5000)
    public String body;

    /** USER, ALL_PARENTS, ALL_STUDENTS, ALL_STAFF, CLASS */
    @Column(length = 40)
    public String audience;

    /** Class name when audience = CLASS. */
    public String audienceClass;

    public LocalDateTime sentAt = LocalDateTime.now();
}
