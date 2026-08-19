package com.insurance.portal.repository;

import com.insurance.portal.model.Payment;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByCustomer(User customer);
    List<Payment> findAllByStatus(PaymentStatus status);
    Page<Payment> findAllByStatus(PaymentStatus status, Pageable pageable);
    long countByStatus(PaymentStatus status);
    List<Payment> findAllByApplication_Id(Long applicationId);
    boolean existsByApplication_IdAndStatus(Long applicationId, PaymentStatus status);
    boolean existsByApplication_IdAndPeriodNumberAndStatusNot(Long applicationId, Integer periodNumber, PaymentStatus status);

    void deleteAllByCustomer(User customer);

    @Query(value = """
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
        FROM payments
        WHERE created_at >= :start
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month_key
        """, nativeQuery = true)
    List<Object[]> monthlyCountsSince(@Param("start") LocalDateTime start);

    @Query(value = """
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE created_at >= :start
          AND status = 'VERIFIED'
          AND amount IS NOT NULL
          AND (payment_type IS NULL OR payment_type <> 'CLAIM_PAYOUT')
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month_key
        """, nativeQuery = true)
    List<Object[]> monthlyVerifiedRevenueSince(@Param("start") LocalDateTime start);

    /** Duplicate-transaction check: same last-6 digits already submitted and not rejected */
    boolean existsByTransactionLastSixDigitsAndStatusNot(String transactionLastSixDigits, PaymentStatus status);
}
