package com.insurance.portal.repository;

import com.insurance.portal.model.AutoCheckLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AutoCheckLogRepository extends JpaRepository<AutoCheckLog, Long> {

    List<AutoCheckLog> findTop50ByOrderByCreatedAtDesc();

    List<AutoCheckLog> findByCheckTypeOrderByCreatedAtDesc(String checkType);

    long countByCheckTypeAndCreatedAtAfter(String checkType, LocalDateTime after);

    List<AutoCheckLog> findTop1ByCheckTypeOrderByCreatedAtDesc(String checkType);
}
