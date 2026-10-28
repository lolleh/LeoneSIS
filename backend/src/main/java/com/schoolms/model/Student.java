package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "students", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_admission", columnNames = {"school_id", "admission_no"})
})
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "school_id", nullable = false)
    public UUID schoolId;

    /** Optional portal account for the student. */
    public UUID userId;

    @Column(name = "admission_no", nullable = false, length = 40)
    public String admissionNo;

    @Column(nullable = false)
    public String firstName;

    @Column(nullable = false)
    public String lastName;

    public String gender;
    public LocalDate dateOfBirth;
    public String gradeLevel;
    public String schoolClass;

    public String guardianName;

    @Column(length = 160)
    public String guardianEmail;

    public String guardianPhone;
    public String address;
    public String bloodGroup;
    public String notes;

    public LocalDate enrolledAt = LocalDate.now();
    public boolean active = true;
    public LocalDateTime createdAt = LocalDateTime.now();

    public String fullName() {
        return firstName + " " + lastName;
    }
}
