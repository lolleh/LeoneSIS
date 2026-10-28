package com.schoolms.repo;

import com.schoolms.model.MessageRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRecipientRepository extends JpaRepository<MessageRecipient, UUID> {
    List<MessageRecipient> findByUserIdOrderByReadAtAsc(UUID userId);
    List<MessageRecipient> findByMessageId(UUID messageId);
    Optional<MessageRecipient> findByMessageIdAndUserId(UUID messageId, UUID userId);
    long countByUserIdAndReadAtIsNull(UUID userId);
    void deleteByMessageId(UUID messageId);
}
