package com.schoolms.repo;

import com.schoolms.model.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    List<Assessment> findBySchoolIdOrderByAssessmentDateDesc(UUID schoolId);
    List<Assessment> findBySchoolIdAndSchoolClassOrderByAssessmentDateDesc(UUID schoolId, String schoolClass);
    List<Assessment> findBySchoolIdAndPublishedTrueOrderByAssessmentDateDesc(UUID schoolId);
    Optional<Assessment> findByIdAndSchoolId(UUID id, UUID schoolId);
    long countBySchoolId(UUID schoolId);

    @Query("select distinct a.subject from Assessment a where a.schoolId = :schoolId order by a.subject")
    List<String> findDistinctSubjects(@Param("schoolId") UUID schoolId);
}
