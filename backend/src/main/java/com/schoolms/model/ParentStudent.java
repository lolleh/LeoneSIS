package com.schoolms.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "parent_students", uniqueConstraints = {
        @UniqueConstraint(name = "uk_parent_student", columnNames = {"parent_user_id", "student_id"})
})
public class ParentStudent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "parent_user_id", nullable = false)
    public UUID parentUserId;

    @Column(name = "student_id", nullable = false)
    public UUID studentId;
}
