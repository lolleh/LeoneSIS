package com.schoolms.repo;

import com.schoolms.model.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GradeRepository extends JpaRepository<Grade, UUID> {
    List<Grade> findByAssessmentId(UUID assessmentId);
    List<Grade> findByStudentId(UUID studentId);
    List<Grade> findByStudentIdIn(List<UUID> studentIds);
    Optional<Grade> findByAssessmentIdAndStudentId(UUID assessmentId, UUID studentId);
    long countByAssessmentId(UUID assessmentId);
    void deleteByAssessmentId(UUID assessmentId);
}
