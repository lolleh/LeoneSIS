package com.schoolms.repo;

import com.schoolms.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findBySchoolIdOrderBySentAtDesc(UUID schoolId);
    List<Message> findBySenderUserIdOrderBySentAtDesc(UUID senderUserId);
    long countBySchoolId(UUID schoolId);
}
