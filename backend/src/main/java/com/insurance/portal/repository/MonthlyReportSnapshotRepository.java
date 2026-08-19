package com.insurance.portal.repository;

import com.insurance.portal.model.MonthlyReportSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MonthlyReportSnapshotRepository extends JpaRepository<MonthlyReportSnapshot, Long> {
    List<MonthlyReportSnapshot> findAllByOrderByCreatedAtDesc();
    boolean existsByYearAndMonth(int year, int month);
}
