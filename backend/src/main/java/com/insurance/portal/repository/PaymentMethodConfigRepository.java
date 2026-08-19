package com.insurance.portal.repository;

import com.insurance.portal.model.PaymentMethodConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentMethodConfigRepository extends JpaRepository<PaymentMethodConfig, Long> {
    List<PaymentMethodConfig> findAllByActiveTrueOrderByIdAsc();
    List<PaymentMethodConfig> findAllByOrderByIdAsc();
    Optional<PaymentMethodConfig> findByMethodKey(String methodKey);
    boolean existsByMethodKey(String methodKey);
}
