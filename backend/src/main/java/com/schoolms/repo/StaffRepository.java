package com.schoolms.repo;

import com.schoolms.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffRepository extends JpaRepository<Staff, UUID> {
    List<Staff> findBySchoolIdOrderByFirstNameAsc(UUID schoolId);
    Optional<Staff> findByIdAndSchoolId(UUID id, UUID schoolId);
    Optional<Staff> findByUserId(UUID userId);
    boolean existsBySchoolIdAndStaffNo(UUID schoolId, String staffNo);
    long countBySchoolIdAndActiveTrue(UUID schoolId);
}
