package com.schoolms.repo;

import com.schoolms.model.SessionToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface SessionTokenRepository extends JpaRepository<SessionToken, UUID> {
    Optional<SessionToken> findByToken(String token);
    void deleteByToken(String token);
    void deleteByUserId(UUID userId);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}
