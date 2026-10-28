package com.schoolms.repo;

import com.schoolms.model.School;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SchoolRepository extends JpaRepository<School, UUID> {
    Optional<School> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    List<School> findAllByOrderByNameAsc();
}
