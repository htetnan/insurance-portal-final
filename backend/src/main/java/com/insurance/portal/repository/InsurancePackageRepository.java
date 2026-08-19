package com.insurance.portal.repository;

import com.insurance.portal.model.InsurancePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InsurancePackageRepository extends JpaRepository<InsurancePackage, Long> {
    List<InsurancePackage> findAllByActive(boolean active);
    List<InsurancePackage> findAllByType(String type);
    List<InsurancePackage> findAllByActiveAndType(boolean active, String type);
}
