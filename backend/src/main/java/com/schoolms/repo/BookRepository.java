package com.schoolms.repo;

import com.schoolms.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {
    List<Book> findBySchoolIdIsNullOrSchoolIdOrderByCreatedAtDesc(UUID schoolId);
    List<Book> findBySchoolIdIsNullOrderByCreatedAtDesc();
    long countBySchoolIdIsNull();
    long countBySchoolIdIsNullOrSchoolId(UUID schoolId);
}
