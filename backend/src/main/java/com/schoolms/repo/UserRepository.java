package com.schoolms.repo;

import com.schoolms.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findBySchoolIdOrderByFullNameAsc(UUID schoolId);
    List<User> findBySchoolIdAndRoleOrderByFullNameAsc(UUID schoolId, String role);
    List<User> findBySchoolIdAndRoleIn(UUID schoolId, Collection<String> roles);
    List<User> findByRoleOrderByFullNameAsc(String role);
    long countBySchoolId(UUID schoolId);
}
