package com.schoolms.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fee_transactions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_fee_school_reference", columnNames = {"school_id", "reference"})
})
public class FeeTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "school_id", nullable = false)
    public UUID schoolId;

    @Column(nullable = false)
    public UUID studentId;

    /** CHARGE or PAYMENT */
    @Column(nullable = false, length = 20)
    public String type;

    @Column(nullable = false, length = 40)
    public String category;

    @Column(nullable = false, length = 220)
    public String description;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Column(nullable = false)
    public LocalDate transactionDate;

    @Column(length = 80)
    public String term;

    @Column(length = 40)
    public String paymentMethod;

    @Column(length = 120)
    public String paymentReference;

    /** Internal receipt / invoice number. */
    @Column(nullable = false, length = 40)
    public String reference;

    @Column(length = 1000)
    public String notes;

    /** POSTED or VOID */
    @Column(nullable = false, length = 20)
    public String status = "POSTED";

    @Column(length = 500)
    public String voidReason;

    public UUID recordedByUserId;
    public UUID voidedByUserId;
    public LocalDateTime voidedAt;
    public LocalDateTime createdAt = LocalDateTime.now();
}
