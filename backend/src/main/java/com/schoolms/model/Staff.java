package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff", uniqueConstraints = {
        @UniqueConstraint(name = "uk_staff_number", columnNames = {"school_id", "staff_no"})
})
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "school_id", nullable = false)
    public UUID schoolId;

    public UUID userId;

    @Column(name = "staff_no", nullable = false, length = 40)
    public String staffNo;

    @Column(nullable = false)
    public String firstName;

    @Column(nullable = false)
    public String lastName;

    public String position;
    public String department;
    public String email;
    public String phone;
    public String qualification;
    public LocalDate hireDate = LocalDate.now();
    public boolean active = true;
    public LocalDateTime createdAt = LocalDateTime.now();

    public String fullName() {
        return firstName + " " + lastName;
    }
}
