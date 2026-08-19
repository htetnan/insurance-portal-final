package com.insurance.portal.repository;

import com.insurance.portal.model.AnalyticsResetRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnalyticsResetRepository extends JpaRepository<AnalyticsResetRecord, Long> {
    /** Returns the most recent reset event, or empty if no reset has ever been performed. */
    Optional<AnalyticsResetRecord> findTopByOrderByResetAtDesc();
}
