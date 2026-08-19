package com.insurance.portal.repository;

import com.insurance.portal.model.PolicyApplication;
import com.insurance.portal.model.User;
import com.insurance.portal.model.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PolicyApplicationRepository extends JpaRepository<PolicyApplication, Long> {
    List<PolicyApplication> findAllByCustomer(User customer);
    List<PolicyApplication> findAllByCustomerAndStatus(User customer, ApplicationStatus status);
    List<PolicyApplication> findAllByAgent(User agent);
    List<PolicyApplication> findAllByAgentAndStatus(User agent, ApplicationStatus status);
    List<PolicyApplication> findAllByStatus(ApplicationStatus status);
    Page<PolicyApplication> findAllByStatus(ApplicationStatus status, Pageable pageable);
    long countByCustomer(User customer);
    long countByCustomerAndStatus(User customer, ApplicationStatus status);
    long countByStatus(ApplicationStatus status);

    @Query("SELECT a FROM PolicyApplication a WHERE a.customer = :customer AND a.status = 'APPROVED'")
    List<PolicyApplication> findApprovedByCustomer(User customer);

    @Query(value = """
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
        FROM policy_applications
        WHERE created_at >= :start
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month_key
        """, nativeQuery = true)
    List<Object[]> monthlyCountsSince(@Param("start") LocalDateTime start);

    void deleteAllByCustomer(User customer);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE PolicyApplication a SET a.agent = null WHERE a.agent = :agent")
    void clearAgentFromApplications(User agent);
}
