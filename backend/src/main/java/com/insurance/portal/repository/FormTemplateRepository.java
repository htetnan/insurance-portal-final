package com.insurance.portal.repository;

import com.insurance.portal.model.FormTemplate;
import com.insurance.portal.model.enums.FormType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FormTemplateRepository extends JpaRepository<FormTemplate, Long> {
    List<FormTemplate> findAllByInsurancePackageId(Long packageId);
    Optional<FormTemplate> findByInsurancePackageIdAndFormType(Long packageId, FormType formType);
    boolean existsByInsurancePackageIdAndFormType(Long packageId, FormType formType);

    // Legacy — kept for backward compat during migration; prefer package-based queries
    Optional<FormTemplate> findFirstByInsurancePackageIdAndFormTypeAndActiveTrue(Long packageId, FormType formType);
}
