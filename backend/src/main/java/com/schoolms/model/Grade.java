package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "grades", uniqueConstraints = {
        @UniqueConstraint(name = "uk_grade_assessment_student", columnNames = {"assessment_id", "student_id"})
})
public class Grade {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public UUID assessmentId;

    @Column(nullable = false)
    public UUID studentId;

    public Double score;
    public String letter;

    @Column(length = 500)
    public String comment;

    public UUID postedByUserId;
    public LocalDateTime postedAt = LocalDateTime.now();
}
