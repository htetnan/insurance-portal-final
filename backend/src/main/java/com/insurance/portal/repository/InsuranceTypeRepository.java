package com.insurance.portal.repository;

import com.insurance.portal.model.InsuranceType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InsuranceTypeRepository extends JpaRepository<InsuranceType, Long> {
    Optional<InsuranceType> findByNameIgnoreCase(String name);
    java.util.List<InsuranceType> findAllByOrderByNameAsc();
}
