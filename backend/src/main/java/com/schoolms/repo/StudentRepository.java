package com.schoolms.repo;

import com.schoolms.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    List<Student> findBySchoolIdOrderByFirstNameAsc(UUID schoolId);
    List<Student> findBySchoolIdAndActiveTrueOrderByFirstNameAsc(UUID schoolId);
    List<Student> findBySchoolIdAndSchoolClassAndActiveTrueOrderByFirstNameAsc(UUID schoolId, String schoolClass);
    Optional<Student> findByUserId(UUID userId);
    Optional<Student> findByIdAndSchoolId(UUID id, UUID schoolId);
    boolean existsBySchoolIdAndAdmissionNo(UUID schoolId, String admissionNo);
    long countBySchoolIdAndActiveTrue(UUID schoolId);

    @Query("select distinct s.schoolClass from Student s where s.schoolId = :schoolId and s.schoolClass is not null and s.active = true order by s.schoolClass")
    List<String> findDistinctClasses(@Param("schoolId") UUID schoolId);

    @Query("select distinct s.gradeLevel from Student s where s.schoolId = :schoolId and s.gradeLevel is not null and s.active = true order by s.gradeLevel")
    List<String> findDistinctGradeLevels(@Param("schoolId") UUID schoolId);
}
