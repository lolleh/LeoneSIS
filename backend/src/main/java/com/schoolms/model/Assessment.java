package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assessments")
public class Assessment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public UUID schoolId;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false)
    public String subject;

    /** QUIZ, ASSIGNMENT, TEST, EXAM, PROJECT */
    @Column(nullable = false, length = 30)
    public String type;

    public String gradeLevel;
    public String schoolClass;

    @Column(nullable = false)
    public double maxScore = 100;

    public LocalDate assessmentDate = LocalDate.now();

    public UUID postedByUserId;
    public boolean published = false;
    public LocalDateTime createdAt = LocalDateTime.now();
}
