package com.schoolms.repo;

import com.schoolms.model.ParentStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ParentStudentRepository extends JpaRepository<ParentStudent, UUID> {
    List<ParentStudent> findByParentUserId(UUID parentUserId);
    List<ParentStudent> findByStudentId(UUID studentId);
    boolean existsByParentUserIdAndStudentId(UUID parentUserId, UUID studentId);
    void deleteByParentUserIdAndStudentId(UUID parentUserId, UUID studentId);
    void deleteByStudentId(UUID studentId);
}
