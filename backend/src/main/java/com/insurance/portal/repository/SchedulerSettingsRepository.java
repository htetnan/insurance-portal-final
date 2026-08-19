package com.insurance.portal.repository;

import com.insurance.portal.model.SchedulerSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SchedulerSettingsRepository extends JpaRepository<SchedulerSettings, Long> {
}
