package com.schoolms.repo;

import com.schoolms.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    List<AttendanceRecord> findBySchoolIdAndAttendanceDate(UUID schoolId, LocalDate attendanceDate);
    List<AttendanceRecord> findBySchoolIdAndAttendanceDateOrderByCreatedAtDesc(UUID schoolId, LocalDate attendanceDate);
    List<AttendanceRecord> findByStudentIdOrderByAttendanceDateDesc(UUID studentId);
    List<AttendanceRecord> findByStudentIdInAndAttendanceDate(List<UUID> studentIds, LocalDate attendanceDate);
    Optional<AttendanceRecord> findByStudentIdAndAttendanceDate(UUID studentId, LocalDate attendanceDate);
    long countBySchoolIdAndAttendanceDateAndStatus(UUID schoolId, LocalDate attendanceDate, String status);
    long countByStudentIdAndStatus(UUID studentId, String status);
    long countByStudentId(UUID studentId);
}
