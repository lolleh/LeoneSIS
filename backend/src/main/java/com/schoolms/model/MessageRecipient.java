package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "message_recipients", uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_recipient", columnNames = {"message_id", "user_id"})
})
public class MessageRecipient {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public UUID messageId;

    @Column(nullable = false)
    public UUID userId;

    public LocalDateTime readAt;
}
