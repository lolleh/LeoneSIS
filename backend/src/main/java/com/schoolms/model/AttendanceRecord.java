package com.schoolms.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "attendance_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_attendance_student_date", columnNames = {"student_id", "attendance_date"})
})
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public UUID schoolId;

    @Column(nullable = false)
    public UUID studentId;

    @Column(name = "attendance_date", nullable = false)
    public LocalDate attendanceDate;

    /** PRESENT, ABSENT, LATE, EXCUSED */
    @Column(nullable = false, length = 20)
    public String status;

    @Column(length = 500)
    public String comment;

    public UUID markedByUserId;
    public LocalDateTime createdAt = LocalDateTime.now();
}
