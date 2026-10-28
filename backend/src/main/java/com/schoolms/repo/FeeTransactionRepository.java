package com.schoolms.repo;

import com.schoolms.model.FeeTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeeTransactionRepository extends JpaRepository<FeeTransaction, UUID> {
    List<FeeTransaction> findBySchoolIdOrderByTransactionDateDescCreatedAtDesc(UUID schoolId);
    List<FeeTransaction> findBySchoolIdAndStudentIdOrderByTransactionDateDescCreatedAtDesc(UUID schoolId, UUID studentId);
    List<FeeTransaction> findByStudentIdInOrderByTransactionDateDescCreatedAtDesc(List<UUID> studentIds);
    List<FeeTransaction> findByStudentIdOrderByCreatedAtAsc(UUID studentId);
    List<FeeTransaction> findAllByOrderByTransactionDateDescCreatedAtDesc();
    Optional<FeeTransaction> findByIdAndSchoolId(UUID id, UUID schoolId);
    boolean existsBySchoolIdAndReference(UUID schoolId, String reference);
    long countBySchoolId(UUID schoolId);
}
