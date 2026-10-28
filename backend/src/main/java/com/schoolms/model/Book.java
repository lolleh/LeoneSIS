package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "books")
public class Book {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    /** Null means the title is available to every school. */
    public UUID schoolId;

    @Column(nullable = false)
    public String title;

    public String author;
    public String category;

    @Column(length = 2000)
    public String description;

    @Column(nullable = false, length = 255)
    public String fileName;

    public String contentType;
    public long fileSize;
    public String storagePath;

    public UUID uploadedByUserId;
    public LocalDateTime createdAt = LocalDateTime.now();
}
